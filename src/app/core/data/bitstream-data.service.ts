import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/internal/Observable';
import { map, switchMap } from 'rxjs/operators';
import { hasValue, isNotEmpty } from '../../shared/empty.util';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { FollowLinkConfig } from '../../shared/utils/follow-link-config.model';
import { dataService } from '../cache/builders/build-decorators';
import { RemoteDataBuildService } from '../cache/builders/remote-data-build.service';
import { ObjectCacheService } from '../cache/object-cache.service';
import { CoreState } from '../core.reducers';
import { Bitstream } from '../shared/bitstream.model';
import { BITSTREAM } from '../shared/bitstream.resource-type';
import { Bundle } from '../shared/bundle.model';
import { HALEndpointService } from '../shared/hal-endpoint.service';
import { Item } from '../shared/item.model';
import { BundleDataService } from './bundle-data.service';
import { CommunityDataService } from './community-data.service';
import { DataService } from './data.service';
import { DSOChangeAnalyzer } from './dso-change-analyzer.service';
import { PaginatedList } from './paginated-list';
import { RemoteData } from './remote-data';
import { RemoteDataError } from './remote-data-error';
import { FindListOptions } from './request.models';
import { RequestService } from './request.service';

/**
 * A service to retrieve {@link Bitstream}s from the REST API
 */
@Injectable({
  providedIn: 'root'
})
@dataService(BITSTREAM)
export class BitstreamDataService extends DataService<Bitstream> {

  /**
   * The HAL path to the bitstream endpoint
   */
  protected linkPath = 'bitstreams';

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected cds: CommunityDataService,
    protected objectCache: ObjectCacheService,
    protected halService: HALEndpointService,
    protected notificationsService: NotificationsService,
    protected http: HttpClient,
    protected comparator: DSOChangeAnalyzer<Bitstream>,
    protected bundleService: BundleDataService,
  ) {
    super();
  }

  /**
   * Retrieves the {@link Bitstream}s in a given bundle
   *
   * @param bundle the bundle to retrieve bitstreams from
   * @param options options for the find all request
   */
  findAllByBundle(bundle: Bundle, options?: FindListOptions, ...linksToFollow: Array<FollowLinkConfig<Bitstream>>): Observable<RemoteData<PaginatedList<Bitstream>>> {
    return this.findAllByHref(bundle._links.bitstreams.href, options, ...linksToFollow);
  }

  /**
   * Retrieves the thumbnail for the given item
   * @returns {Observable<RemoteData<{@link Bitstream}>>} the first bitstream in the THUMBNAIL bundle
   */
  // TODO should be implemented rest side. {@link Item} should get a thumbnail link
  public getThumbnailFor(item: Item): Observable<RemoteData<Bitstream>> {
    return this.bundleService.findByItemAndName(item, 'THUMBNAIL').pipe(
      switchMap((bundleRD: RemoteData<Bundle>) => {
        if (isNotEmpty(bundleRD.payload)) {
          return this.findAllByBundle(bundleRD.payload, { elementsPerPage: 1 }).pipe(
            map((bitstreamRD: RemoteData<PaginatedList<Bitstream>>) => {
              if (hasValue(bitstreamRD.payload) && hasValue(bitstreamRD.payload.page)) {
                return new RemoteData(
                  false,
                  false,
                  true,
                  undefined,
                  bitstreamRD.payload.page[0]
                );
              } else {
                return bitstreamRD as any;
              }
            })
          );
        } else {
          return [bundleRD as any];
        }
      })
    );
  }

  /**
   * Retrieve the matching thumbnail for a {@link Bitstream}.
   *
   * The {@link Item} is technically redundant, but is available
   * in all current use cases, and having it simplifies this method
   *
   * @param item The {@link Item} the {@link Bitstream} and its thumbnail are a part of
   * @param bitstreamInOriginal The original {@link Bitstream} to find the thumbnail for
   */
  // TODO should be implemented rest side
  public getMatchingThumbnail(item: Item, bitstreamInOriginal: Bitstream): Observable<RemoteData<Bitstream>> {
    return this.bundleService.findByItemAndName(item, 'THUMBNAIL').pipe(
      switchMap((bundleRD: RemoteData<Bundle>) => {
        if (isNotEmpty(bundleRD.payload)) {
          return this.findAllByBundle(bundleRD.payload, { elementsPerPage: Number.MAX_SAFE_INTEGER }).pipe(
            map((bitstreamRD: RemoteData<PaginatedList<Bitstream>>) => {
              if (hasValue(bitstreamRD.payload) && hasValue(bitstreamRD.payload.page)) {
                const matchingThumbnail = bitstreamRD.payload.page.find((thumbnail: Bitstream) =>
                  thumbnail.name.startsWith(bitstreamInOriginal.name)
                );
                if (hasValue(matchingThumbnail)) {
                  return new RemoteData(
                    false,
                    false,
                    true,
                    undefined,
                    matchingThumbnail
                  );
                } else {
                  return new RemoteData(
                    false,
                    false,
                    false,
                    new RemoteDataError(404, '404', 'No matching thumbnail found'),
                    undefined
                  );
                }
              } else {
                return bitstreamRD as any;
              }
            })
          );
        } else {
          return [bundleRD as any];
        }
      })
    );
  }

  /**
   * Retrieve all {@link Bitstream}s in a certain {@link Bundle}.
   *
   * The {@link Item} is technically redundant, but is available
   * in all current use cases, and having it simplifies this method
   *
   * @param item the {@link Item} the {@link Bundle} is a part of
   * @param bundleName the name of the {@link Bundle} we want to find {@link Bitstream}s for
   * @param options the {@link FindListOptions} for the request
   * @param linksToFollow the {@link FollowLinkConfig}s for the request
   */
  public findAllByItemAndBundleName(item: Item, bundleName: string, options?: FindListOptions, ...linksToFollow: Array<FollowLinkConfig<Bitstream>>): Observable<RemoteData<PaginatedList<Bitstream>>> {
    return this.bundleService.findByItemAndName(item, bundleName).pipe(
      switchMap((bundleRD: RemoteData<Bundle>) => {
        if (hasValue(bundleRD.payload)) {
          return this.findAllByBundle(bundleRD.payload, options, ...linksToFollow);
        } else {
          return [bundleRD as any];
        }
      })
    );
  }

}
