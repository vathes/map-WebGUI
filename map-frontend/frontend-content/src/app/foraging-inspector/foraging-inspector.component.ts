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
  clicked_session; // plotly interaction dev purpose
  clicked_subject; // plotly interaction dev purpose


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
            this.selected_subject = subj_id;

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
      this.selected_session = this.foraging_subjects[value]['sessions'][this.foraging_subjects[value]['sessions'].length-1]
      console.log('plotly_data: ', this.plot_data)

      for (let [index, data] of Object.entries(this.plot_data)) { // recoloring plot
        console.log('custom_data: ', data['customdata'], ' index: ', index)
        if (data['mode'] == 'markers') { // removing current markers
          this.plot_data[index] = {};

        } else if (data['mode'] == 'lines') { // recoloring lines, pushing new marker data
          if (data['customdata'] == this.selected_subject) {
            data.line['color'] = "rgb(82, 100, 218)" // royal blue
            let session_marker = {
              x: [this.selected_session],
              y: [data.y[data.y.length - 1]],
              mode: 'markers',
              type: 'scatter',
              customdata: this.selected_subject,
              xaxis: data.xaxis,
              yaxis: data.yaxis,
              marker: {color: "rgb(82, 100, 218)", size: "8"}
            }
            this.plot_data.push(session_marker);
          } else {
            data.line['color'] = "rgb(211, 211, 211)"
          }
        } 
        
      }
    }
    if (type == 'session') {
      this.selected_session = value;
      // remove current marker traces and readd new markers for the selected session/subject
      for (let [index, data] of Object.entries(this.plot_data)) {
        if (data['mode'] == 'markers') { // removing current markers
          this.plot_data[index] = {};

        } else if (data['mode'] == 'lines') { // recoloring lines, pushing new marker data
          if (data['customdata'] == this.selected_subject) {
            let session_marker = {
              x: [this.selected_session],
              y: [data.y[data.y.length - 1]],
              mode: 'markers',
              type: 'scatter',
              customdata: this.selected_subject,
              xaxis: data.xaxis,
              yaxis: data.yaxis,
              marker: {color: "rgb(82, 100, 218)", size: "8"}
            }
            this.plot_data.push(session_marker);
          } 
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
        
        console.log('subjForagingPerformance: ', subjForagingPerformance);
        this.plot_data.push(...subjForagingPerformance['traces'])
        // this.subject_sessions[subj_id].push(subjForagingPerformance['session'])
        if (!this.selected_session) {
          console.log("last item in subjForagingPerformance['sessions']: ", [...subjForagingPerformance['sessions']].pop());
          console.log("length of subjForagingPerformance['sessions']: ", subjForagingPerformance['sessions'].length);
          this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][subjForagingPerformance['sessions'].length-1]; // making sure that the selected session is taken from the selected subject
          
        }
        for (let trace of subjForagingPerformance['traces']) {
          trace['customdata'] = subjForagingPerformance['subject_id'];
          trace['name'] = subjForagingPerformance['subject_id']
          if (subj_id == this.selected_subject) {
            trace.line['color'] = "rgb(82, 100, 218)" //royalblue
            console.log('y value at ', subjForagingPerformance['sessions'].length - 1, 'is ', trace.y[subjForagingPerformance['sessions'].length - 1])
            let session_marker = {
              x: [this.selected_session],
              y: [trace.y[subjForagingPerformance['sessions'].length - 1]],
              mode: 'markers',
              type: 'scatter',
              customdata: this.selected_subject,
              xaxis: trace.xaxis,
              yaxis: trace.yaxis,
              marker: {color: "rgb(82, 100, 218)", size: "8"}
            }
            this.plot_data.push(session_marker)
          }
        }
      }
      // console.log('subjForaging Data: ', subjForagingPerformance)
      console.log('this.foraging_subjects: ', this.foraging_subjects)
      // console.log('this.subject-sessions: ', this.subject_sessions)
      console.log('this.plot_data: ', this.plot_data)
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
    if (event['points']){
      console.log('selected_subject: ', event.points[0]['data']['customdata']);
      this.clicked_subject = event.points[0]['data']['customdata'];
      this.updateMenu(event.points[0]['data']['customdata'], 'subject'); // updating the menu with subject defaults to selecting the latest session - do not reverse the order of update menu here

      this.clicked_session = event.points[0]['x'];
      this.updateMenu(event.points[0]['x'], 'session');
    }
    
  }

}
