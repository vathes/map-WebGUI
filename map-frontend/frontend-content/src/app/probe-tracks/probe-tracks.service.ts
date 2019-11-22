import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient} from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;

@Injectable({
  providedIn: 'root'
})
export class ProbeTracksService {
  private probeTracks;

  private probeTracksLoaded = new Subject();

  constructor(private http: HttpClient) { }

  retrieveprobeTracks() {
    // console.log('retrieving probe tracks');
    this.http.post(BACKEND_API_URL + `/plot/probeTracks`, {})
      .subscribe(
        (probeTracksData) => {
          // console.log('retrieved Probe Tracks Data!: ', Object.entries(probeTracksData).length)
          this.probeTracks = probeTracksData;
          this.probeTracksLoaded.next(this.probeTracks);
        },
        (err: any) => {
          console.log('error in retrieving project probe tracks');
          console.error(err);
        }
      );


  }

  
  getprobeTracksLoadedListener() {
    return this.probeTracksLoaded.asObservable();
  }

}
