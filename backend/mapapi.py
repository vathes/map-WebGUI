# mapapi.py: map data api for map-navigator

import os
import json
import uuid
import logging

from PIL import ImageColor
from collections import Counter

from uuid import UUID
from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd
import datajoint as dj
import pathlib
from decimal import Decimal

from flask import Flask
from flask import request
from flask import abort

import boto3
s3_client = boto3.client('s3')

API_VERSION = '0'
app = Flask(__name__)
API_PREFIX = '/v{}'.format(API_VERSION)
is_gunicorn = "gunicorn" in os.environ.get("SERVER_SOFTWARE", "")

os.environ['DJ_SUPPORT_FILEPATH_MANAGEMENT'] = "TRUE"


def mkvmod(mod):
    return dj.create_virtual_module(mod, 'map_v2_{}'.format(mod))


lab = mkvmod('lab')
experiment = mkvmod('experiment')
ephys = mkvmod('ephys')
psth = mkvmod('psth')
report = mkvmod('report')
tracking = mkvmod('tracking')
histology = mkvmod('histology')
foraging_analysis = mkvmod('foraging_analysis')
ccf = mkvmod('ccf')

map_s3_bucket = os.environ.get('MAP_S3_BUCKET')
map_store_location = os.environ.get('MAP_REPORT_STORE_LOCATION')
map_store_stage = os.environ.get('MAP_REPORT_STORE_STAGE')
dj.config['stores'] = {
    'report_store': dict(
      protocol='s3',
      endpoint='s3.amazonaws.com',
      access_key=os.environ.get('AWS_ACCESS_KEY_ID'),
      secret_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
      bucket=map_s3_bucket,
      location=map_store_location,
      stage=map_store_stage
    )
}


class DateTimeEncoder(json.JSONEncoder):
    ''' teach json to dump datetimes, etc '''

    npmap = {
        np.bool_: bool,
        np.uint8: str,
        np.uint16: str,
        np.uint32: str,
        np.uint64: str,
        np.int8: str,
        np.int16: str,
        np.int32: str,
        np.int64: str,
        np.float32: str,
        np.float64: str,
        np.ndarray: list,
        Decimal: float
    }

    def default(self, o):
        if isinstance(o, date):
            return o.isoformat()
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, uuid.UUID):
            return str(o)
        if type(o) in self.npmap:
            return self.npmap[type(o)](o)
        return json.JSONEncoder.default(self, o)

    @classmethod
    def dumps(cls, obj):
        return json.dumps(obj, cls=cls)


# _start:

reqmap = {
    '_q': None,
    'subject': lab.Subject
}
dumps = DateTimeEncoder.dumps


def mkpath(path):
    return '{}{}'.format(API_PREFIX, path)


@app.route(mkpath('/<path:subpath>'), methods=['GET', 'POST'])
def do_req(subpath):
    app.logger.info("method: '{}', path: {}, values: {}".format(
        request.method, request.path, request.values))

    # 1) parse request & arguments
    pathparts = request.path.split('/')[2:]  # ['', 'v0'] [ ... ]
    obj = pathparts[0]

    values = request.values
    postargs, jsonargs = {}, None

    limit = int(request.values['__limit']) if '__limit' in values else None
    order = request.values['__order'] if '__order' in values else None
    proj = json.loads(request.values['__proj']) if '__proj' in values else None

    special_fields = ['__json', '__limit', '__order', '__proj']
    for a in (v for v in values if v not in special_fields):
        # HACK: 'uuid' attrs -> UUID type (see also: datajoint-python #594)
        postargs[a] = UUID(values[a]) if 'uuid' in a else values[a]

    args = [postargs] if len(postargs) else []
    if '__json' in values:
        jsonargs = json.loads(request.values['__json'])
        args += jsonargs if type(jsonargs) == list else [jsonargs]

    args = {} if not args else dj.AndList(args)
    kwargs = {i[0]: i[1] for i in (('as_dict', True,),
                                   ('limit', limit,),
                                   ('order_by', order,)) if i[1] is not None}

    # 2) and dispatch
    app.logger.debug("args: '{}', kwargs: {}".format(args, kwargs))
    if obj not in reqmap:
        abort(404)
    elif obj == '_q':
        return handle_q(pathparts[1], args, proj, **kwargs)
    else:
        q = (reqmap[obj] & args)
        if proj:
            q = q.proj(*proj)

        from time import time
        start = time()
        print('about to fetch requested object')
        print(start)
        fetched = q.fetch(**kwargs)
        dur = time() - start
        print('Took {} seconds to fetch dataset'.format(dur))
        return dumps(fetched)
        # return dumps(q.fetch(**kwargs))


def handle_q(subpath, args, proj, **kwargs):
    '''
    special queries (under '/_q/ URL Space)
      - for sessionpage, provide:
        ((session * subject * lab * user) & arg).proj(flist)
    '''
    app.logger.info("handle_q: subpath: '{}', args: {}".format(subpath, args))

    # ---------- process the "args" ----------
    if isinstance(args, list):
      if len(args) == 1:
        args = args[0]
      else:
        raise ValueError(f'args is a list of multiple dicts: {args}')

    contain_s3fp = False
    if subpath == 'sessionpage':

        sessions = get_sessions_query()

        # handling special GROUPCONCAT attributes: `insert_locations` and `clustering_methods` in args
        insert_locations_restr = make_LIKE_restrictor('insert_locations', args,
                                                      (ephys.ProbeInsertion.RecordableBrainRegion.proj(
                                                        brain_region='CONCAT(hemisphere, " ", brain_area)'),
                                                       'brain_region'))
        clustering_methods_restr = make_LIKE_restrictor('clustering_methods', args,
                                                        (ephys.ClusteringMethod, 'clustering_method'))
        [args.pop(v) for v in ('insert_locations', 'clustering_methods') if v in args]

        q = sessions & args & insert_locations_restr & clustering_methods_restr
    elif subpath == 'session':
        check_is_session_restriction(args)

        sessions = get_sessions_query() & args

        plotsessions = (experiment.Session & args).proj().aggr(report.SessionLevelReport, ...,
                                                               behavior_performance_s3fp = 'behavior_performance',
                                                               keep_all_rows=True)
        plotsessions = plotsessions.aggr(report.SessionLevelProbeTrack, ...,
                                         session_tracks_plot_s3fp='session_tracks_plot', keep_all_rows=True)
        plotsessions = plotsessions.aggr(report.SessionLevelCDReport, ..., coding_direction_s3fp='coding_direction',
                                         keep_all_rows=True)

        contain_s3fp = True
        q = sessions * plotsessions
    elif subpath == 'probe_insertions':
        check_is_session_restriction(args)

        exclude_attrs = ['-electrode_config_name']
        probe_insertions = (ephys.ProbeInsertion * ephys.ProbeInsertion.InsertionLocation).proj(
          ..., *exclude_attrs).aggr(ephys.ProbeInsertion.RecordableBrainRegion.proj(
          brain_region='CONCAT(hemisphere, " ", brain_area)'), ...,
          brain_regions='GROUP_CONCAT(brain_region SEPARATOR", ")', keep_all_rows=True)

        probe_insertions = probe_insertions.aggr(ephys.ClusteringLabel, ..., quality_control='SUM(quality_control) > 0',
                                                 manual_curation='SUM(manual_curation) > 0', keep_all_rows=True).proj(
          ..., quality_control='IFNULL(quality_control, false)', manual_curation='IFNULL(manual_curation, false)')

        probe_insertions = probe_insertions & args
        probe_insertions = probe_insertions.aggr(
          report.ProbeLevelReport, ..., clustering_quality_s3fp='clustering_quality',
          unit_characteristic_s3fp='unit_characteristic', group_psth_s3fp='group_psth', keep_all_rows=True)
        probe_insertions = probe_insertions.aggr(report.ProbeLevelPhotostimEffectReport, ...,
                                                 group_photostim_s3fp='group_photostim', keep_all_rows=True)

        contain_s3fp = True
        q = probe_insertions
    elif subpath == 'units':
        check_is_session_restriction(args)

        exclude_attrs = ['-spike_times', '-waveform', '-unit_uid', '-spike_depths', '-spike_sites',
                         '-probe', '-electrode_config_name', '-electrode_group']
        units = (ephys.Unit * ephys.UnitStat
                 * ephys.ProbeInsertion.InsertionLocation.proj('depth') & args).proj(
          ..., unit_depth='unit_posy + depth', is_all='unit_quality = "all"', *exclude_attrs)

        units = units.aggr(report.UnitLevelEphysReport, ..., unit_psth_s3fp='unit_psth', keep_all_rows=True)
        units = units.aggr(report.UnitLevelTrackingReport, ..., unit_behavior_s3fp='unit_behavior', keep_all_rows=True)

        contain_s3fp = True
        q = units
    elif subpath == 'project_probe_tracks':
        args['project_name'] = 'MAP'
        contain_s3fp = True
        q = report.ProjectLevelProbeTrack.proj(tracks_plot_s3fp='tracks_plot') & args
    elif subpath == 'annotated_electrodes':
        '''
        Return color-coded annotated electrode-region data for all the shanks and probes in the specified session
        "args" has to be a restriction to a session
        '''
        check_is_session_restriction(args)

        probe_insertions, shank_strs = (experiment.Session.proj() * ephys.ProbeInsertion & args).aggr(
          lab.ElectrodeConfig.Electrode * lab.ProbeType.Electrode,
          shanks='GROUP_CONCAT(DISTINCT shank)').fetch('KEY', 'shanks')

        probe_anno_electrodes = []
        for probe_insertion, shank_str in zip(probe_insertions, shank_strs):
            x, y, width, color, anno = [], [], [], [], []
            for shank_no in np.array(shank_str.split(',')).astype(int):
                units = (ephys.Unit * lab.ElectrodeConfig.Electrode * ephys.ProbeInsertion
                         * lab.ProbeType.Electrode.proj('shank')
                         & probe_insertion & {'shank': shank_no})

                ymax, ymin = dj.U().aggr(units, ymax='max(unit_posy)', ymin='0').fetch1('ymax', 'ymin')

                dv_loc = float((ephys.ProbeInsertion.InsertionLocation & probe_insertion).fetch1('depth'))

                annotated_electrodes = (lab.ElectrodeConfig.Electrode * lab.ProbeType.Electrode
                                        * ephys.ProbeInsertion
                                        * histology.ElectrodeCCFPosition.ElectrodePosition
                                        * ccf.CCFAnnotation * ccf.CCFBrainRegion.proj(..., annotation='region_name')
                                        & probe_insertion & {'shank': shank_no})

                if not annotated_electrodes:
                    continue

                pos_x, pos_y, color_code, annotation = annotated_electrodes.fetch(
                  'x_coord', 'y_coord', 'color_code', 'annotation', order_by='y_coord DESC')

                region2color_map = {**{r: c for r, c in zip(annotation, color_code)}, '': 'FFFFFF'}

                # region colorcode, by depths
                y_spacing = np.abs(np.nanmedian(np.where(np.diff(pos_y) == 0, np.nan, np.diff(pos_y))))
                anno_depth_bins = np.arange(ymin, ymax, y_spacing)

                binned_depths, binned_hexcodes, binned_regions = [], [], []
                for s, e in zip(anno_depth_bins[:-1], anno_depth_bins[1:]):
                    regions = annotation[np.logical_and(pos_y > s, pos_y <= e)]
                    region = Counter(regions).most_common()[0][0] if len(regions) else ''
                    if binned_regions and region == binned_regions[-1]:
                        binned_depths[-1] += y_spacing
                    else:
                        binned_regions.append(region)
                        binned_hexcodes.append(region2color_map[region])
                        binned_depths.append(y_spacing)

                region_rgba = [f'rgba{ImageColor.getcolor("#" + chex, "RGBA")}' for chex in binned_hexcodes]

                x.extend([np.mean(pos_x)] * (len(region_rgba) + 1))
                width.extend([np.ptp(pos_x) * 5.5] * (len(region_rgba) + 1))
                y.extend(np.concatenate([[ymin + dv_loc], binned_depths]))
                anno.extend([''] + binned_regions)
                color.extend([f'rgba{ImageColor.getcolor("#FFFFFF", "RGBA")}'] + region_rgba)

            probe_anno_electrodes.append(dict(probe_insertion, x=x, y=y, width=width, color=color, annotation=anno))

        q = probe_anno_electrodes
    elif subpath == 'driftmaps':
        check_is_session_restriction(args)
        contain_s3fp = True
        q = report.ProbeLevelDriftMap.proj(driftmap_s3fp='driftmap') & args
    elif subpath == 'coronal_slice':
        check_is_session_restriction(args)
        contain_s3fp = True
        q = report.ProbeLevelCoronalSlice.proj(coronal_slice_s3fp='coronal_slice') & args
    elif subpath == 'foraging_subject_list':
        q = (lab.Subject.proj() * lab.WaterRestriction.proj('water_restriction_number')
             & (foraging_analysis.SessionTaskProtocol & 'session_task_protocol=100'))
    elif subpath == 'foraging_subject_performance':
        check_is_subject_restriction(args)
        q = {}

        q_two_lp_foraging_sessions = (foraging_analysis.SessionTaskProtocol * lab.WaterRestriction
                                      & 'session_task_protocol=100' & args)

        # Skip this mice if it did not started with 2lp task
        first_protocol = (q_two_lp_foraging_sessions * experiment.Session).fetch(
            'session_task_protocol', order_by='session_date, session_time', limit=1)

        stat_attrs = ['session_pure_choices_num', 'session_foraging_eff_optimal', 'session_early_lick_ratio',
                      'session_mean_reward_sum', 'session_mean_reward_contrast', 'session_total_trial_num',
                      'session_block_num', 'session_double_dipping_ratio']
        if len(first_protocol) and first_protocol[0] == 100:
            this_mouse_session_stats = (
              foraging_analysis.SessionStats.proj(*stat_attrs)
              * experiment.Session.proj('session_date', 'session_time')
              * (foraging_analysis.SessionMatching.WaterPortMatching.proj('bias') & 'water_port="right"')
              & q_two_lp_foraging_sessions).fetch(order_by='session_date, session_time', format='frame').reset_index()

            training_day = (experiment.Session & q_two_lp_foraging_sessions).fetch('session_date')
            training_day = ((training_day - min(training_day)) / timedelta(days=1)).astype(int) + 1
            this_mouse_session_stats['training_day'] = training_day

            # Extract data of interest
            sessions = this_mouse_session_stats['session'].values.astype(int)

            total_trial_num = this_mouse_session_stats['session_pure_choices_num'].values.astype(float)
            foraging_eff = this_mouse_session_stats['session_foraging_eff_optimal'].values.astype(float) * 100
            early_lick_ratio = this_mouse_session_stats['session_early_lick_ratio'].values.astype(float) * 100
            reward_sum_mean = this_mouse_session_stats['session_mean_reward_sum'].values.astype(float)
            reward_contrast_mean = this_mouse_session_stats['session_mean_reward_contrast'].values.astype(float)
            block_length_mean = (this_mouse_session_stats['session_total_trial_num'] / this_mouse_session_stats['session_block_num']).values.astype(float)
            double_dip = this_mouse_session_stats['session_double_dipping_ratio'].values.astype(float) * 100
            abs_matching_bias = np.array([abs(v) if v is not None else v for v in this_mouse_session_stats['bias']], dtype=float)

            # Package into plotly format
            line_format = {'color': 'rgb(211,211,211)', 'width': 1}
            traces = []
            for trace_data, x_axis_id, y_axis_id in zip(
              (total_trial_num, foraging_eff, abs_matching_bias, early_lick_ratio, double_dip, reward_sum_mean, reward_contrast_mean, block_length_mean),
              ('x', 'x2', 'x', 'x2', 'x', 'x2', 'x', 'x2'),
              ('y', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8')):
                traces.append({'x': training_day, 'y': [v if not np.isnan(v) else None for v in trace_data],
                               'xaxis': x_axis_id, 'yaxis': y_axis_id,
                               'type': 'scatter', 'mode': 'lines', 'line': line_format,
                               'customdata': args['subject_id'], 'name': args['subject_id']})

            q = {'subject_id': args['subject_id'], 'sessions': sessions, 'training_days': training_day, 'traces': traces}
    elif subpath == 'foraging_session_report':
        check_is_subject_restriction(args)
        q = experiment.Session.proj() & args
        contain_s3fp = True
        q = q.aggr(report.SessionLevelForagingSummary, ..., session_foraging_summary_s3fp='session_foraging_summary', keep_all_rows=True)
        q = q.aggr(report.SessionLevelForagingLickingPSTH, ..., session_foraging_licking_psth_s3fp='session_foraging_licking_psth', keep_all_rows=True)
    else:
        abort(404)

    if isinstance(q, (list, dict)):
        ret = q
    else:
        if proj:
            ret = q.proj(*proj).fetch(**kwargs)
        else:
            ret = q.fetch(**kwargs)

    print('{} - Returning: {} entries'.format(subpath, len(ret)))
    app.logger.info('{} - Returning: {} entries'.format(subpath, len(ret)))
    return dumps(post_process(ret)) if contain_s3fp else dumps(ret)


# ----------- More generalized query methods -------------------

def get_sessions_query():
    sessions = (experiment.Session * lab.WaterRestriction).aggr(
      ephys.ProbeInsertion, 'water_restriction_number', 'username',
      session_date="cast(concat(session_date, ' ', session_time) as datetime)",
      probe_count='count(insertion_number)',
      probe_insertions='GROUP_CONCAT(insertion_number ORDER BY insertion_number)', keep_all_rows=True)

    sessions = sessions.aggr(ephys.ProbeInsertion.RecordableBrainRegion.proj(
      brain_region='CONCAT(hemisphere, " ", brain_area)'), ...,
      insert_locations='GROUP_CONCAT(brain_region SEPARATOR", ")', keep_all_rows=True)

    sessions = sessions.aggr(tracking.Tracking, ..., tracking_avai='count(trial) > 0', keep_all_rows=True)

    unitsessions = experiment.Session.proj().aggr(ephys.Unit.proj(), ...,
                                                  clustering_methods='GROUP_CONCAT(DISTINCT clustering_method SEPARATOR", ")',
                                                  keep_all_rows=True)
    unitsessions = unitsessions.aggr(ephys.ClusteringLabel, ..., quality_control='SUM(quality_control) > 0',
                                     manual_curation='SUM(manual_curation) > 0', keep_all_rows=True).proj(
      ..., quality_control='IFNULL(quality_control, false)', manual_curation='IFNULL(manual_curation, false)')
    unitsessions = unitsessions.aggr(histology.ElectrodeCCFPosition, ..., histology_avai='count(insertion_number) > 0',
                                     keep_all_rows=True)

    return sessions * unitsessions

# ----------- HELPER METHODS -------------------


def check_is_subject_restriction(args):
    is_subj_res = np.all([k in args for k in lab.Subject.primary_key])
    if not is_subj_res:
        raise RuntimeError('args has to be a restriction to a subject')
    return True


def check_is_session_restriction(args):
    is_sess_res = np.all([k in args for k in experiment.Session.primary_key])
    if not is_sess_res:
        raise RuntimeError('args has to be a restriction to a session')
    return True


def make_presign_url(data_link):
    return s3_client.generate_presigned_url(
      'get_object',
      Params={'Bucket': map_s3_bucket,
              'Key': data_link,
              'ResponseContentType': 'image/png'},
      ExpiresIn=3 * 60 * 60)


def convert_to_s3_path(local_path):
    local_path = pathlib.Path(local_path)
    rel_path = local_path.relative_to(pathlib.Path(map_store_stage))
    return (pathlib.Path(map_store_location) / rel_path).as_posix()


def post_process(ret):
    return [{k.replace('_s3fp', ''): make_presign_url(convert_to_s3_path(v)) if '_s3fp' in k and v else v
             for k, v in i.items()} for i in ret]


def make_LIKE_restrictor(attr_name, restriction_dict, lookup_table=None):
    if attr_name in restriction_dict:
        attr_value = restriction_dict[attr_name]
        if lookup_table is not None:
            tbl, lookup_attr = lookup_table
            if not (tbl & {lookup_attr: attr_value}):
                return {}
            return f'{attr_name} LIKE "%{attr_value}%"'
    return {}

# --------------------------------


if is_gunicorn:
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

if __name__ == '__main__':
    app.run(host='0.0.0.0')
