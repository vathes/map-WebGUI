import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;


@Injectable({providedIn: 'root'})
export class ForagingInspectorService {
  private foragingInspectorLoaded = {};
  private foragingSubjectListLoaded = new Subject();

  constructor(private http: HttpClient) { }

  retrieveForagingInspector(subject) {
    this.foragingInspectorLoaded[subject.subject_id] = new Subject();
    this.http.post(BACKEND_API_URL + `/plot/foraging_subject`, subject)
      .subscribe(
        (subjForagingData) => {
          console.log('retrieved subject-level foraging data: ', subjForagingData)
          this.foragingInspectorLoaded[subject.subject_id].next(subjForagingData);
        },
        (err: any) => {
          console.log('error in retrieving subject-level foraging data');
          console.error(err);
        }
      );
  }

  getForagingInspectorLoadedListener(subject_id) {
    return this.foragingInspectorLoaded[subject_id].asObservable();
  }

  retrieveForagingSubjectList(subject_filter) {
    this.http.post(BACKEND_API_URL + `/plot/foraging_subject_list`, subject_filter)
      .subscribe(
        (foragingSubjs) => {
          console.log('retrieved foraging subject list')
          this.foragingSubjectListLoaded.next(foragingSubjs);
        },
        (err: any) => {
          console.log('error in retrieving foraging subject list');
          console.error(err);
        }
      );
  }

  getForagingSubjectListLoadedListener() {
    return this.foragingSubjectListLoaded.asObservable();
  }

}
