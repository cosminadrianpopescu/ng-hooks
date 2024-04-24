import { Observable, Subscription } from "rxjs";
export declare function connectable(instance: any): (<T>(obs: Observable<T>, callback: (t: T) => void, type?: string) => void);
export declare function getAllSubscriptions(instance: any): Array<Subscription>;
export declare function getSubscriptionsByType(instance: any, type: string): Array<Subscription>;
