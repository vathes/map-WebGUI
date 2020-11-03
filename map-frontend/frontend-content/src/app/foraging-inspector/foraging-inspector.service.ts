import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;


@Injectable({providedIn: 'root'})
export class ForagingInspectorService {
  private foragingSubjectPerformanceLoaded = {};
  private foragingSessionReportLoaded = {};
  private foragingSubjectListLoaded = new Subject();

  constructor(private http: HttpClient) { }

  retrieveForagingSubjectPerformance(subject) {
    this.foragingSubjectPerformanceLoaded[subject.subject_id] = new Subject();
    this.http.post(BACKEND_API_URL + `/plot/foraging_subject_performance`, subject)
      .subscribe(
        (subjForagingPerformance) => {
          // console.log('retrieved subject-level foraging performance data: ', subjForagingPerformance)
          this.foragingSubjectPerformanceLoaded[subject.subject_id].next(subjForagingPerformance);
          
        },
        (err: any) => {
          console.log('error in retrieving subject-level foraging data');
          console.error(err);
        }
      );
  }

  getForagingSubjectPerformanceLoadedListener(subject_id) {
    // console.log('subject_id: ', subject_id)
    return this.foragingSubjectPerformanceLoaded[subject_id].asObservable();
  }

  retrieveForagingSessionReport(subject) {
    this.foragingSessionReportLoaded[subject.subject_id] = new Subject();
    this.http.post(BACKEND_API_URL + `/plot/foraging_session_report`, subject)
      .subscribe(
        (subjForagingReport) => {
          this.foragingSessionReportLoaded[subject.subject_id].next(subjForagingReport);
        },
        (err: any) => {
          console.log('error in retrieving subject-level foraging reports');
          console.error(err);
        }
      );
  }

  getForagingSessionReportLoadedListener(subject_id) {
    return this.foragingSessionReportLoaded[subject_id].asObservable();
  }

  retrieveForagingSubjectList(subject_filter) {
    this.http.post(BACKEND_API_URL + `/plot/foraging_subject_list`, subject_filter)
      .subscribe(
        (foragingSubjs) => {
          // console.log('retrieved foraging subject list: ', foragingSubjs)
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
