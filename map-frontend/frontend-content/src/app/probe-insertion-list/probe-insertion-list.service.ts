import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;
@Injectable({
  providedIn: 'root'
})
export class ProbeInsertionListService {
  private probeInsertionList;

  private probeInsertionListLoaded = new Subject();
  
  constructor(private http: HttpClient) { }

  retrieveProbeInsertions(sessionInfo) {
    const mouse_id = sessionInfo['subject_id'];
    const session_id = sessionInfo['session'];

    this.http.post(BACKEND_API_URL + `/plot/probeInsertions`, {
      'subject_id': mouse_id,
      'session': session_id
    })
      .subscribe(
        (probeInsertionData) => {
          console.log('fetched probeInsertionData!: ', probeInsertionData);
          this.probeInsertionList = probeInsertionData;
          this.probeInsertionListLoaded.next(this.probeInsertionList);
        }, 
        (err: any) => {
          console.log('error in retrieving probe insertion list for session');
          console.error(err);
        }
      );
  }

  getProbeInsertionListLoadedListener() {
    return this.probeInsertionListLoaded.asObservable();
  }

}
