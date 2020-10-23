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
  selected_subject;
  selected_session;
  clicked_session; // plotly interaction dev purpose
  clicked_subject; // plotly interaction dev purpose

  ss_plot_width; // in percentage 


  subject_sessions = {}; // made this for menu creation but realized foraging_subject contains that information

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

    this.ss_plot_width = 50; // set initial percentage of static plots to 50:50
    // console.log('Setup plot_layout: ', this.plot_layout);

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
      // console.log('plotly_data: ', this.plot_data)
    }
    else if (type == 'session') {
      this.selected_session = value;
    }

    let selected_session_idx = this.foraging_subjects[this.selected_subject]['sessions'].indexOf(this.selected_session)
    let training_day = this.foraging_subjects[this.selected_subject]['training_days'][selected_session_idx]

    // remove current marker traces and read new markers for the selected session/subject
    for (let [index, data] of Object.entries(this.plot_data)) {
      if (data['mode'] == 'markers') { // removing current markers
        this.plot_data[index] = {};
      }
      else if (data['mode'] == 'lines') { // recoloring lines, pushing new marker data
        if (data['customdata'] == this.selected_subject) {
          data.line['color'] = "rgb(82, 100, 218)"  // royal blue
          let session_marker = {
            x: [training_day],
            y: [data.y[selected_session_idx]],
            mode: 'markers',
            type: 'scatter',
            customdata: this.selected_subject,
            xaxis: data.xaxis,
            yaxis: data.yaxis,
            marker: {color: "rgb(82, 100, 218)", size: "8"}
          }
          this.plot_data.push(session_marker);
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
        this.plot_data.push(...subjForagingPerformance['traces'])
        this.subject_sessions[subj_id]['sessions'].push(subjForagingPerformance['sessions'])
        if (!this.selected_session && subj_id == this.selected_subject) {
          // console.log("last item in subjForagingPerformance['sessions']: ", [...subjForagingPerformance['sessions']].pop());
          // console.log("length of subjForagingPerformance['sessions']: ", subjForagingPerformance['sessions'].length);
          this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][subjForagingPerformance['sessions'].length-1]; // making sure that the selected session is taken from the selected subject
          this.updateMenu(this.selected_session, 'session');
        }
      }

      // console.log('subjForaging Data: ', subjForagingPerformance)
      // console.log('this.foraging_subjects: ', this.foraging_subjects)
      // console.log('this.subject_sessions: ', this.subject_sessions)
      // console.log('this.plot_data: ', this.plot_data)
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
      console.log('selected_subject: ', event.points[0]['data']['customdata']);

      // subject
      this.clicked_subject = event.points[0]['data']['customdata'];
      this.selected_subject = event.points[0]['data']['customdata'];
      this.selected_session = this.foraging_subjects[this.selected_subject]['sessions'][this.foraging_subjects[this.selected_subject]['sessions'].length-1];

      // session
      let session_idx = this.foraging_subjects[this.selected_subject]['training_days'].indexOf(event.points[0]['x'].toString());
      let session = this.foraging_subjects[this.selected_subject]['sessions'][session_idx];
      this.clicked_session = session;
      this.updateMenu(session, 'session');
    }
    
  }

 
  resizePlot(value) {
    console.log('user wants to resize plot to: ', value)
    this.ss_plot_width = value;
   }

}
