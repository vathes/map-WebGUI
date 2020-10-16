import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormArray } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
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
  filteredSubjectIdOptions = [];
  filteredSessionIdOptions = [];

  plot_data = [];
  plot_layout;
  plot_config;

  foraging_subjects = {};
  selected_subject;
  selected_session;

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
            this.filteredSubjectIdOptions.push({'subject_id': entry['subject_id'], 'water_restriction_number': entry['subject_id']});
        }
        console.log('Subjects: ', Object.keys(this.foraging_subjects))

        for (let subj_id of Object.keys(this.foraging_subjects)) {
          console.log('Request foraging data for subject: ', subj_id);
          this.getSubjectForagingData(subj_id)
        }

      });

  }

  updateMenu() {
  }


  getSubjectForagingData(subj_id) {
  let subj_request = {'subject_id': subj_id}
  this.foragingInspectorService.retrieveForagingInspector(subj_request);
  this.subjectForagingDataSubscriptions[subj_id] = this.foragingInspectorService.getForagingInspectorLoadedListener(subj_id)
    .subscribe((subjForagingData) => {
      console.log('Retrieve subject-level foraging data for: ', subj_id);
      console.log('inspecting subjForagingData: ', subjForagingData);
      if ('subject_id' in subjForagingData) {
        this.foraging_subjects[subjForagingData['subject_id']]['sessions'] = subjForagingData['session']
        this.plot_data.push(...subjForagingData['traces'])
      }
    });
  }

}
