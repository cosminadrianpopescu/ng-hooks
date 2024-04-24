const DECORATORS = '__decorators__';
const WATCHERS_KEY = '__watcherskey__';
const INITIAL_CALLBACK = '--initial-callback--';
const SEALED = '--sealed--';
const CYCLES_KEY = '__cycles__';
const WATCHERS_CALLBACK = '--watchers-callback--';
export const DESTROY_CALLBACK = '--destroy-callback--';
export function overwriteCycle(which, ctor) {
    const sealedKey = `${SEALED}${which}`;
    if (ctor[sealedKey]) {
        return;
    }
    const key = `${INITIAL_CALLBACK}${which}`;
    if (!ctor[key] && ctor[which]) {
        ctor[key] = ctor[which];
    }
    ctor[which] = function (...args) {
        console.log('calling', which);
        if (this[key]) {
            this[key](...args);
        }
        const callbacks = __getDecorations(this.constructor.prototype, CYCLES_KEY);
        (callbacks || []).filter(c => c.arg == which).forEach(c => this[c.prop](args));
        if (which == 'ngOnDestroy' && !!this[DESTROY_CALLBACK]) {
            this[DESTROY_CALLBACK]();
        }
        if (which == 'ngOnChanges' && !!this[WATCHERS_CALLBACK]) {
            this[WATCHERS_CALLBACK](...args);
        }
    };
    ctor[sealedKey] = true;
}
export function Watcher(prop) {
    return function (ctor, property) {
        if (!ctor[WATCHERS_CALLBACK]) {
            const callback = function (changes) {
                const watchers = __getDecorations(this.constructor.prototype, WATCHERS_KEY);
                const toRun = new Map();
                watchers.filter(w => !!changes[w.arg]).forEach(w => {
                    if (!toRun.has(w.prop)) {
                        toRun.set(w.prop, []);
                    }
                    toRun.get(w.prop).push(w.arg);
                });
                Array.from(toRun.keys()).forEach(method => {
                    const args = toRun.get(method).reduce((acc, v) => Object.assign(acc, { [v]: changes[v] }), {});
                    this[method](args);
                });
            };
            ctor[WATCHERS_CALLBACK] = callback;
        }
        overwriteCycle('ngOnChanges', ctor);
        return __doPropDecoration(WATCHERS_KEY, prop, ctor, property);
    };
}
export function NgCycle(which) {
    return function (ctor, property) {
        overwriteCycle(which, ctor);
        return __doPropDecoration(CYCLES_KEY, which, ctor, property);
    };
}
export function NgAfterViewChecked() {
    return NgCycle('ngAfterViewChecked');
}
export function NgAfterContentChecked() {
    return NgCycle('ngAfterContentInit');
}
export function NgAfterContentInit() {
    return NgCycle('ngAfterContentInit');
}
export function NgDoCheck() {
    return NgCycle('ngDoCkeck');
}
export function NgOnChanges() {
    return NgCycle('ngOnChanges');
}
export function NgAfterViewInit() {
    return NgCycle('ngAfterViewInit');
}
export function NgOnDestroy() {
    return NgCycle('ngOnDestroy');
}
export function NgOnInit() {
    return NgCycle('ngOnInit');
}
export function getCycles(instance) {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}
export function getWatchers(instance) {
    return __getDecorations(instance.prototype, WATCHERS_KEY);
}
function __doPropDecoration(decorationName, arg, ctor, property) {
    const c = ctor.constructor;
    let map = Reflect.getOwnMetadata(DECORATORS, Object);
    if (!map) {
        map = new Map();
    }
    if (!map.get(c)) {
        map.set(c, new Map());
    }
    if (!Array.isArray(map.get(c).get(decorationName))) {
        map.get(c).set(decorationName, []);
    }
    map.get(c).get(decorationName).push({ prop: property, arg: arg });
    Reflect.defineProperty(ctor, property, { enumerable: true, writable: true, configurable: true });
    Reflect.defineMetadata(DECORATORS, map, Object);
    return ctor;
}
export function __decorateProperty(decorationName, arg) {
    return function (ctor, property) {
        return __doPropDecoration(decorationName, arg, ctor, property);
    };
}
export function __getDecorations(ctor, key) {
    if (ctor == null) {
        return [];
    }
    const decorators = Reflect.getOwnMetadata(DECORATORS, Object);
    let result = [];
    if (!decorators) {
        return [];
    }
    const decorations = decorators.get(ctor.constructor);
    if (decorations) {
        result = decorations.get(key) || [];
    }
    return result.concat(__getDecorations(Object.getPrototypeOf(ctor), key));
}
