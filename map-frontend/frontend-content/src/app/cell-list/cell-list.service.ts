import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;
@Injectable({
  providedIn: 'root'
})
export class CellListService {
  private cellList;
  private cellListLoaded = new Subject();

  private regionColor;
  private regionColorLoaded = new Subject();

  constructor(private http: HttpClient) { }

  retrieveCellList(sessionInfo) {
    this.http.post(BACKEND_API_URL + `/plot/units`, sessionInfo)
      .subscribe(
        (sessionCellData) => {
          // console.log('retrieved cell Data!: ', Object.entries(sessionCellData).length)
          this.cellList = sessionCellData;
          this.cellListLoaded.next(this.cellList);
        },
        (err: any) => {
          console.log('error in retrieving cell list for session');
          console.error(err);
        }
      );
  }

  getCellListLoadedListener() {
    return this.cellListLoaded.asObservable();
  }

  retrieveRegionColor(sessionInfo) {
    this.http.post(BACKEND_API_URL + `/plot/annotated_electrodes`, sessionInfo)
      .subscribe(
        (probeRegionColor) => {
          console.log('retrieved region color data!: ', Object.entries(probeRegionColor))
          this.regionColor = probeRegionColor;
          this.regionColorLoaded.next(this.regionColor);
        },
        (err: any) => {
          console.log('error in retrieving region color for session');
          console.error(err);
        }
      );
  }

  getRegionColorLoadedListener() {
    return this.regionColorLoaded.asObservable();
  }

}
