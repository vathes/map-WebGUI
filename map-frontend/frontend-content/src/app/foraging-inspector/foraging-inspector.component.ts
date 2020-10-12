import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormArray } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';

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
  filteredSubjectIdOptions: [];
  filteredSessionIdOptions: [];

  constructor() { }

  ngOnInit() {
  }

  updateMenu() {

  }

}
