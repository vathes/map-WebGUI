import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { CellListService } from '../cell-list.service';

@Component({
  selector: 'app-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['./cell.component.css']
})
export class CellComponent implements OnInit, OnDestroy {
  public mouse_id: string;
  public session_id: string;
  public insertion_num: string;
  units: any;
  selectedEvent: string;
  unitsLoading: boolean;
  hideMissingPlots: boolean;

  private cellSubscription: Subscription;

  constructor(private route: ActivatedRoute, public cellListService: CellListService) { }

  ngOnInit() {
    this.hideMissingPlots = true;
    this.unitsLoading = true;
    this.mouse_id = this.route.snapshot.paramMap.get('mouseID');
    this.session_id = this.route.snapshot.paramMap.get('sessionID');
    this.insertion_num = this.route.snapshot.paramMap.get('insertionNum');

    this.cellListService.retrieveCellList({'subject_id': this.mouse_id,
                                           'session': this.session_id,
                                           'insertion_number': this.insertion_num});
    this.cellSubscription = this.cellListService.getCellListLoadedListener()
      .subscribe((unitsData) => {
        this.unitsLoading = false;
        if (Object.entries(unitsData).length > 0) {
          // console.log('cell data retrieved for session: ', this.session_id, ', insertion: ', this.insertion_num)
          // console.log(unitsData);
          this.units = unitsData;
        } 
      });
  }

  ngOnDestroy() {
    if (this.cellSubscription) {
      this.cellSubscription.unsubscribe();
    }
  }

  toggleUnitsView() {
    this.hideMissingPlots = !this.hideMissingPlots;
  }



}
