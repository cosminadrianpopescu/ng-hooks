import { DESTROY_CALLBACK, overwriteCycle } from "./decorators.mjs";

const DEFAULT_SUBSCRIPTIONS_TYPE = '--default-subscriptions-type--';
const SUBS_KEY = '--subscriptions--';

export type Subscribable = {
    unsubscribe: () => void;
}

type InternalSubscription = {
    s: Subscribable;
    type: string;
}

export type Connectable<T> = {
    subscribe: (callback: (value: T) => void) => Subscribable;
    emit?: (value: T) => void;
}

export function connectable(instance: any): (<T>(obs: Connectable<T>, callback: (t: T) => void, type?: string) => void) {
    const proto = Object.getPrototypeOf(instance);

    if (!proto[DESTROY_CALLBACK]) {
        proto[DESTROY_CALLBACK] = function() {
            (this[SUBS_KEY] as Array<InternalSubscription> || []).map(s => s.s).forEach(s => s.unsubscribe());
        };
        overwriteCycle('ngOnDestroy', proto);
    }

    return function<T>(obs: Connectable<T>, callback: (t: T) => void, type: string = DEFAULT_SUBSCRIPTIONS_TYPE) {
        if (!Array.isArray(this[SUBS_KEY])) {
            this[SUBS_KEY] = [];
        }
        this[SUBS_KEY].push({type: type, s: obs.subscribe(callback)})
    }.bind(instance);
}

export function getAllSubscriptions(instance: any): Array<Subscribable> {
    return ((instance[SUBS_KEY] || []) as Array<InternalSubscription>).map(s => s.s);
}

export function getSubscriptionsByType(instance: any, type: string): Array<Subscribable> {
    return ((instance[SUBS_KEY] || []) as Array<InternalSubscription>).filter(s => s.type == type).map(s => s.s);
}
