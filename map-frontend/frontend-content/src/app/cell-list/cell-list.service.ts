import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;


@Injectable({providedIn: 'root'})
export class CellListService {
  private cellList;
  private cellListLoaded = [];
  private driftmapLoaded = new Subject();
  private coronalsliceLoaded = new Subject();
  private regionColor;
  private regionColorLoaded = new Subject();

  constructor(private http: HttpClient) { }

  retrieveCellList(sessionInfo) {
    this.cellListLoaded[sessionInfo.insertion_number] = new Subject();
    this.http.post(BACKEND_API_URL + `/plot/units`, sessionInfo)
      .subscribe(
        (sessionCellData) => {
          console.log('retrieved cell data: ', Object.entries(sessionCellData))
          // this.cellList = sessionCellData;
          this.cellListLoaded[sessionInfo.insertion_number].next(sessionCellData);
        },
        (err: any) => {
          console.log('error in retrieving cell list for session');
          console.error(err);
        }
      );
  }

  getCellListLoadedListener(insertion_number) {
    return this.cellListLoaded[insertion_number].asObservable();
  }

  retrieveRegionColor(sessionInfo) {
    this.http.post(BACKEND_API_URL + `/plot/annotated_electrodes`, sessionInfo)
      .subscribe(
        (probeRegionColor) => {
          console.log('retrieved region color data: ', Object.entries(probeRegionColor))
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

  retrieveDriftmap(sessionInfo) {
    this.http.post(BACKEND_API_URL + `/plot/driftmap`, sessionInfo)
      .subscribe(
        (driftmap) => {
          console.log('retrieved driftmap data: ', driftmap)
          this.driftmapLoaded.next(driftmap);
        },
        (err: any) => {
          console.log('error in retrieving driftmap for session');
          console.error(err);
        }
      );
  }

  getDriftmapLoadedListener() {
    return this.driftmapLoaded.asObservable();
  }

  retrieveCoronalSlice(sessionInfo) {
    this.http.post(BACKEND_API_URL + `/plot/coronal_slice`, sessionInfo)
      .subscribe(
        (coronal_slice) => {
          console.log('retrieved coronal slice data: ', coronal_slice)
          this.coronalsliceLoaded.next(coronal_slice);
        },
        (err: any) => {
          console.log('error in retrieving coronal slice for session');
          console.error(err);
        }
      );
  }

  getCoronalsliceLoadedListener() {
    return this.coronalsliceLoaded.asObservable();
  }

}
