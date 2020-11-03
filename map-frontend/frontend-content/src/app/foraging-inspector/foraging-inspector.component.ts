import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormArray } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {ForagingInspectorService} from "../foraging-inspector/foraging-inspector.service";

@Component({
  selector: 'app-foraging-inspector',
  templateUrl: './foraging-inspector.component.html',
  styleUrls: ['./foraging-inspector.component.css']
})

export class ForagingInspectorComponent implements OnInit {
  fi_filter_form = new FormGroup({
    session_id_control : new FormControl(),
    subject_id_control: new FormControl()
  });
  filteredSubjectIdOptions: Observable<string[]>;
  filteredSessionIdOptions: Observable<string[]>;

  plot_data_session = [];
  plot_data_training_day = [];
  plot_layout;
  plot_config;

  foraging_subjects = {};
  selected_subject;
  selected_session;
  selected_training_day;

  subject_sessions = {}; 
  view_by_training_date = false; // default the view of plot by session number

  zoomPlotURL: string;
  showModal = false;

  private subjectForagingPerformanceSubscriptions;
  private subjectForagingReportSubscriptions;
  private subjectListSubscription: Subscription;

  constructor(public foragingInspectorService: ForagingInspectorService) { }

  ngOnInit() {
    this.subjectForagingPerformanceSubscriptions = {};
    this.subjectForagingReportSubscriptions = {};

    // === Define static plot_layout and plot_config
    this.plot_layout = {
      height: 680,
      margin: {
        l: 80,
        r: 20,
        b: 40,
        t: 35,
        pad: 4
      },
      grid: {
        rows: 4,
        columns: 2,
        subplots:[['xy','x2y2'], ['xy3','x2y4'], ['xy5','x2y6'], ['xy7','x2y8']]
      },
      annotations: [
        {
          text: "Total finished trials",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.20, //position in x domain
          y: 1.05, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Foraging efficiency (optimal) %",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.80, //position in x domain
          y: 1.05, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Absolute matching bias",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.20, //position in x domain
          y: 0.77, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Early lick trials %",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.80, //position in x domain
          y: 0.78, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Double dipping all (%)",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.20, //position in x domain
          y: 0.5, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Mean reward prob sum",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.80, //position in x domain
          y: 0.5, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Mean reward prob contrast",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.20, //position in x domain
          y: 0.20, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        },
        {
          text: "Mean block length",
          font: {size: 16, color: 'black'},
          showarrow: false,
          align: 'center',
          x: 0.80, //position in x domain
          y: 0.20, //position in y domain
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'center'
        }
      ],
      showlegend: false,
      hovermode: 'closest'
    };

    this.plot_config = {
      showLink: false,
      showSendToCloud: false,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian',
                      'hoverCompareCartesian', 'toImage', 'toggleSpikelines'],
    };


    // === all Foraging Subjects ===
    // console.log('Request all Foraging Subjects');
    this.foragingInspectorService.retrieveForagingSubjectList({'as_dict': true});
    this.subjectListSubscription = this.foragingInspectorService.getForagingSubjectListLoadedListener()
      .subscribe((foragingSubjectList) => {
        for (let entry of Object.values(foragingSubjectList)) {
            this.subjectForagingPerformanceSubscriptions[entry['subject_id']] = Subscription;
            this.subjectForagingReportSubscriptions[entry['subject_id']] = Subscription;

            this.foraging_subjects[entry['subject_id']] = {'sessions': [], 'reports': {}};
            this.subject_sessions[entry['subject_id']] = {subj_name: `${entry["water_restriction_number"]} (${entry["subject_id"]})`, sessions: []}
            // this.filteredSubjectIdOptions.push({'subject_id': entry['subject_id'], 'water_restriction_number': entry['subject_id']});
        }
        // console.log('Subjects: ', Object.keys(this.foraging_subjects))

        for (let subj_id of Object.keys(this.foraging_subjects)) {
          if (!this.selected_subject) {
            this.selected_subject = subj_id;
          }
          // console.log('Request foraging data for subject: ', subj_id);
          this.getSubjectForagingPerformance(subj_id);
          this.getSubjectForagingReport(subj_id);
          
        }
      });

    // making filter menu here
    this.filteredSessionIdOptions = this.fi_filter_form.controls.session_id_control.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value, 'session'))
      );

    this.filteredSubjectIdOptions = this.fi_filter_form.controls.subject_id_control.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value, 'subject'))
      );
  }

  private _filter(value: string, menuType: string): string[] {

    // console.log('filtering for: ', value)
    const filterValue = value.toString().toLowerCase();
    if (menuType == 'session') {
      if (this.selected_subject && this.selected_session) {
        // console.log('selected subj: ', this.selected_subject);
        const result =  this.foraging_subjects[this.selected_subject]['sessions'].filter(menu_items => {
          if (menu_items && menu_items.toLowerCase().includes(filterValue)) {
            return true;
          }
        });
        return result;
      }
      
    } else if (menuType == 'subject') {

      // console.log('Object.kyes(foraging_subj): ',Object.keys(this.foraging_subjects))
      let nicknames = []
      Object.values(this.subject_sessions).forEach(subject => {
        // console.log('subject nickname: ', subject['subj_name'])
        nicknames.push(subject['subj_name']);
      });
      
      // const result =  Object.keys(this.foraging_subjects).filter(menu_items => {
      const result =  nicknames.filter(menu_items => {
        if (menu_items && menu_items.toLowerCase().includes(filterValue)) {
          return true;
        }
      });
      // console.log('result: ', result);
      return result;
    }

  }

  updateMenu(value, type) {
    // console.log('updateMenu ran');
    // console.log('value: ', value)
    if (type == 'subject') {
      
      this.selected_subject = value.split("(")[1].split(")")[0]; // gets the subject id between the parenthesis from HH04 (473611)
      this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][this.foraging_subjects[this.selected_subject]['sessions'].length-1];
      // console.log('plotly_data: ', this.plot_data_training_day)
    }
    else if (type == 'session') {
      this.selected_session = value;
    }

    let selected_session_idx = this.foraging_subjects[this.selected_subject]['sessions'].indexOf(this.selected_session)
    let training_day = this.foraging_subjects[this.selected_subject]['training_days'][selected_session_idx]

    // ---- Update highlighted marker traces and the selected session/subject ----

    // for training-day data
    for (let [index, data] of Object.entries(this.plot_data_training_day)) {
      if (data['mode'] == 'markers') { // removing current markers
        this.plot_data_training_day[index] = {};
      }
      else if (data['mode'] == 'lines') { // recoloring lines, pushing new marker data
        if (data['customdata'] == this.selected_subject) {
          data.line['color'] = "rgb(82, 100, 218)"  // royal blue
          let session_marker = {
            x: [training_day],
            y: [data.y[training_day - 1]],
            mode: 'markers',
            type: 'scatter',
            customdata: this.selected_subject,
            name: this.subject_sessions[this.selected_subject]['subj_name'],
            xaxis: data.xaxis,
            yaxis: data.yaxis,
            marker: {color: "rgb(82, 100, 218)", size: "8"}
            // marker: {color: "rgb(82, 20, 18)", size: "8"} // for debug - purple marker color
          }
          this.plot_data_training_day.push(session_marker);
        }
        else {
        data.line['color'] = "rgb(211, 211, 211)"
        }
      }
    }

    // for session data
    for (let [index, data] of Object.entries(this.plot_data_session)) {
      if (data['mode'] == 'markers') { // removing current markers
        this.plot_data_session[index] = {};
      }
      else if (data['mode'] == 'lines') { // recoloring lines, pushing new marker data
        if (data['customdata'] == this.selected_subject) {
          data.line['color'] = "rgb(82, 100, 218)"  // royal blue
          let session_marker = {
            x: [this.selected_session],
            y: [data.y[selected_session_idx]],
            mode: 'markers',
            type: 'scatter',
            customdata: this.selected_subject,
            name: this.subject_sessions[this.selected_subject]['subj_name'],
            xaxis: data.xaxis,
            yaxis: data.yaxis,
            marker: {color: "rgb(82, 100, 218)", size: "8"}
          }
          this.plot_data_session.push(session_marker);
        }
        else {
          data.line['color'] = "rgb(211, 211, 211)"
        }
      }
    }

  }

  getSubjectForagingPerformance(subj_id) {
  let subj_request = {'subject_id': subj_id}
  this.foragingInspectorService.retrieveForagingSubjectPerformance(subj_request);
  this.subjectForagingPerformanceSubscriptions[subj_id] = this.foragingInspectorService.getForagingSubjectPerformanceLoadedListener(subj_id)
    .subscribe((subjForagingPerformance) => {
      // console.log('Retrieve subject-level foraging data for: ', subj_id);
      // console.log('inspecting subjForagingPerformance: ', subjForagingPerformance);

      if ('subject_id' in subjForagingPerformance) {
        this.foraging_subjects[subjForagingPerformance['subject_id']]['sessions'] = subjForagingPerformance['sessions'];
        this.foraging_subjects[subjForagingPerformance['subject_id']]['training_days'] = subjForagingPerformance['training_days'];
        
        // console.log('subjForagingPerformance: ', subjForagingPerformance);
        this.plot_data_session.push(...subjForagingPerformance['session_traces'])
        this.plot_data_training_day.push(...subjForagingPerformance['training_day_traces'])
        this.subject_sessions[subj_id]['sessions'].push(subjForagingPerformance['sessions'])
        if (!this.selected_session && subj_id == this.selected_subject) {
          // console.log("last item in subjForagingPerformance['sessions']: ", [...subjForagingPerformance['sessions']].pop());
          // console.log("length of subjForagingPerformance['sessions']: ", subjForagingPerformance['sessions'].length);
          this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][subjForagingPerformance['sessions'].length-1]; // making sure that the selected session is taken from the selected subject
          this.updateMenu(this.selected_session, 'session');
        }
      }
      
    });
  }

  getSubjectForagingReport(subj_id) {
  let subj_request = {'subject_id': subj_id}
  this.foragingInspectorService.retrieveForagingSessionReport(subj_request);
  this.subjectForagingReportSubscriptions[subj_id] = this.foragingInspectorService.getForagingSessionReportLoadedListener(subj_id)
    .subscribe((subjForagingReports) => {
      for (let entry of subjForagingReports) {
        this.foraging_subjects[subj_id]['reports'][entry['session']] = entry;
      }
    });
    // console.log('foraging_subject: ', this.foraging_subjects)
  }

  plotClicked(event) {
    console.log('plot clicked!!: ', event);
    if (event['points']){
      // subject
      this.selected_subject = event.points[0]['data']['customdata'];

      // session / training-day
      if (this.view_by_training_date) {
        this.selected_training_day = event.points[0]['x'].toString();
        let selected_trday_idx = this.foraging_subjects[this.selected_subject]['training_days'].indexOf(this.selected_training_day)
        this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][selected_trday_idx]
      }
      else {
        this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][event.points[0]['pointIndex']];
      }

      this.updateMenu(this.selected_session, 'session');
    }
    
  }
 


  toggleXaxis(event) {
    this.view_by_training_date = event.checked;
  }

  toggleStaticPlotsModal = (plotURL) => {
    this.zoomPlotURL = plotURL;
    this.showModal = !this.showModal;
  }

}
