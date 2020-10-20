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

  plot_data = [];
  plot_layout;
  plot_config;

  foraging_subjects = {};
  foraging_session_reports = [];
  selected_subject;
  selected_session;
  clicked_session;


  // subject_sessions = {}; // made this for menu creation but realized foraging_subject contains that information

  private subjectForagingPerformanceSubscriptions;
  private subjectForagingReportSubscriptions;
  private subjectListSubscription: Subscription;

  constructor(public foragingInspectorService: ForagingInspectorService) { }

  ngOnInit() {
    this.subjectForagingPerformanceSubscriptions = {};
    this.subjectForagingReportSubscriptions = {};

    // === Define static plot_layout and plot_config
    this.plot_layout = {
      margin: {
        l: 80,
        r: 20,
        b: 40,
        t: 20,
        pad: 4
      },
      grid: {
        rows: 4,
        columns: 2,
        subplots:[['xy','x2y2'], ['xy3','x2y4'], ['xy5','x2y6'], ['xy7','x2y8']]
      },
      showlegend: false
    };

    this.plot_config = {
      showLink: false,
      showSendToCloud: false,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian',
                      'hoverCompareCartesian', 'toImage', 'toggleSpikelines'],
    };
    console.log('Setup plot_layout: ', this.plot_layout);

    // === all Foraging Subjects ===
    console.log('Request all Foraging Subjects');
    this.foragingInspectorService.retrieveForagingSubjectList({'as_dict': true});
    this.subjectListSubscription = this.foragingInspectorService.getForagingSubjectListLoadedListener()
      .subscribe((foragingSubjectList) => {
        for (let entry of Object.values(foragingSubjectList)) {
            this.subjectForagingPerformanceSubscriptions[entry['subject_id']] = Subscription;
            this.subjectForagingReportSubscriptions[entry['subject_id']] = Subscription;

            this.foraging_subjects[entry['subject_id']] = {'sessions': {}};
            // this.filteredSubjectIdOptions.push({'subject_id': entry['subject_id'], 'water_restriction_number': entry['subject_id']});
        }
        console.log('Subjects: ', Object.keys(this.foraging_subjects))

        for (let subj_id of Object.keys(this.foraging_subjects)) {
          if (!this.selected_subject) {
            this.selected_subject = subj_id
          }
          console.log('Request foraging data for subject: ', subj_id);
          this.getSubjectForagingPerformance(subj_id);
          this.getSubjectForagingReport(subj_id);
          // this.subject_sessions[subj_id] = [];
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

    console.log('filtering for: ', value)
    const filterValue = value.toString().toLowerCase();
    if (menuType == 'session') {
      if (this.selected_subject && this.selected_session) {
        console.log('selected subj: ', this.selected_subject);
        const result =  this.foraging_subjects[this.selected_subject]['sessions'].filter(menu_items => {
          if (menu_items && menu_items.toLowerCase().includes(filterValue)) {
            return true;
          }
        });
        return result;
      }
      
    } else if (menuType == 'subject') {

      console.log('Object.kyes(foraging_subj): ',Object.keys(this.foraging_subjects))
      const result =  Object.keys(this.foraging_subjects).filter(menu_items => {
        if (menu_items && menu_items.toLowerCase().includes(filterValue)) {
          return true;
        }
      });
      console.log('result: ', result);
      return result;
    }

  }

  updateMenu(value, type) {
    console.log('updateMenu ran');
    console.log('value: ', value)
    if (type == 'subject') {
      this.selected_subject = value;
      this.selected_session = this.foraging_subjects[value]['sessions'][-1]
    }
    if (type == 'session') {
      this.selected_session = value;
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
        this.foraging_subjects[subjForagingPerformance['subject_id']]['sessions'] = subjForagingPerformance['sessions']
        this.plot_data.push(...subjForagingPerformance['traces'])
        // this.subject_sessions[subj_id].push(subjForagingPerformance['session'])
        if (!this.selected_session) {
          this.selected_session = subjForagingPerformance['sessions'][-1];
        }
      }
      // console.log('subjForaging Data: ', subjForagingPerformance)
      // console.log('this.foraging_subjects: ', this.foraging_subjects)
      // console.log('this.subject-sessions: ', this.subject_sessions)
    });
  }

  getSubjectForagingReport(subj_id) {
  let subj_request = {'subject_id': subj_id}
  this.foragingInspectorService.retrieveForagingSessionReport(subj_request);
  this.subjectForagingReportSubscriptions[subj_id] = this.foragingInspectorService.getForagingSessionReportLoadedListener(subj_id)
    .subscribe((subjForagingReports) => {
      this.foraging_session_reports.push(...subjForagingReports)
      // console.log('this.foraging_report: ', this.foraging_session_reports)
    });
  }

  plotClicked(event) {
    console.log('plot clicked!!: ', event);
    this.clicked_session = event.points[0]['x'] // of the selected points, all X axis value should match - so just using the first point here

  }

}
