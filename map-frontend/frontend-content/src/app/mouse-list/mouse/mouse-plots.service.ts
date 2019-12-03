import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const BACKEND_API_URL = environment.backend_url;
@Injectable({
  providedIn: 'root'
})
export class MousePlotsService {
  private weightWaterIntake;
  private TCSessionDuration;

  private waterWeightPlotLoaded = new Subject();
  private TCSessionDurationPlotLoaded = new Subject();

  constructor(private http: HttpClient) { }

  getWaterWeightPlot(subjectInfo) {
    this.http.post(BACKEND_API_URL + `/plot/waterWeightPlot`, subjectInfo)
      .subscribe(
        (plotData) => {
          this.weightWaterIntake = plotData;

          this.waterWeightPlotLoaded.next(this.weightWaterIntake);
        },
        (err: any) => {
          console.log('error in retrieving weight & waterIntake plot data');
          console.error(err);
        }
      );
  }
  getTCSessionDurationPlot(subjectInfo) {
    this.http.post(BACKEND_API_URL + `/plot/trialCountsSessionDurationPlot`, subjectInfo)
      .subscribe(
        (plotData) => {
          this.TCSessionDuration = plotData;

          this.TCSessionDurationPlotLoaded.next(this.TCSessionDuration);
        },
        (err: any) => {
          console.log('error in retrieving trial counts session duration plot data');
          console.error(err);
        }
      );
  }


  getWaterWeightPlotLoadedListener() {
    return this.waterWeightPlotLoaded.asObservable();
  }
  getTCSessionDurationPlotLoadedListener() {
    return this.TCSessionDurationPlotLoaded.asObservable();
  }

}
