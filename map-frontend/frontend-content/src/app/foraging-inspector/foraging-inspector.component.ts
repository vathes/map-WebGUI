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
  clicked_session;


  // subject_sessions = {}; // made this for menu creation but realized foraging_subject contains that information

  private subjectForagingDataSubscriptions;
  private subjectListSubscription: Subscription;

  constructor(public foragingInspectorService: ForagingInspectorService) { }

  ngOnInit() {
    this.subjectForagingDataSubscriptions = {};

    // === Define static plot_layout and plot_config
    this.plot_layout = {
      grid: {
        rows: 4,
        columns: 2,
        subplots:[['xy','x2y2'], ['xy3','x2y4'], ['xy5','x2y6'], ['xy7','x2y8']]
      }
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
            this.subjectForagingDataSubscriptions[entry['subject_id']] = Subscription;
            this.foraging_subjects[entry['subject_id']] = {'sessions': {}};
            // this.filteredSubjectIdOptions.push({'subject_id': entry['subject_id'], 'water_restriction_number': entry['subject_id']});
        }
        console.log('Subjects: ', Object.keys(this.foraging_subjects))

        for (let subj_id of Object.keys(this.foraging_subjects)) {
          if (!this.selected_subject) {
            this.selected_subject = subj_id
          }
          console.log('Request foraging data for subject: ', subj_id);
          this.getSubjectForagingData(subj_id);
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
      this.selected_session = this.foraging_subjects[value]['sessions'][0]
    }
    if (type == 'session') {
      this.selected_session = value;
    }
  }


  getSubjectForagingData(subj_id) {
  let subj_request = {'subject_id': subj_id}
  this.foragingInspectorService.retrieveForagingInspector(subj_request);
  this.subjectForagingDataSubscriptions[subj_id] = this.foragingInspectorService.getForagingInspectorLoadedListener(subj_id)
    .subscribe((subjForagingData) => {
      // console.log('Retrieve subject-level foraging data for: ', subj_id);
      // console.log('inspecting subjForagingData: ', subjForagingData);

      if ('subject_id' in subjForagingData) {
        this.foraging_subjects[subjForagingData['subject_id']]['sessions'] = subjForagingData['session']
        this.plot_data.push(...subjForagingData['traces'])
        // this.subject_sessions[subj_id].push(subjForagingData['session'])
        if (!this.selected_session) {
          this.selected_session = subjForagingData['session'][0];
        }
      }
      // console.log('subjForaging Data: ', subjForagingData)
      console.log('this.foraging_subjects: ', this.foraging_subjects)
      // console.log('this.subject-sessions: ', this.subject_sessions)
    });
  }

  plotClicked(event) {
    console.log('plot clicked!!: ', event);
    this.clicked_session = event.points[0]['x'] // of the selected points, all X axis value should match - so just using the first point here
  }

}
