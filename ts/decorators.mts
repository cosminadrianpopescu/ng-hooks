export type CycleType = 'ngOnDestroy' | 'ngAfterViewInit' | 'ngOnChanges' | 'ngOnInit' | 'ngDoCkeck' | 'ngAfterContentInit' | 'ngAfterContentChecked' | 'ngAfterViewChecked';
const DECORATORS = '__decorators__';
const WATCHERS_KEY = '__watcherskey__';

const INITIAL_CALLBACK = '--initial-callback--';
const SEALED = '--sealed--';

const CYCLES_KEY = '__cycles__';
const WATCHERS_CALLBACK = '--watchers-callback--';
export const DESTROY_CALLBACK = '--destroy-callback--';
export type DecoratedClass = {ctor: ClassConstructor, args: Array<any>};
export type DecoratedClasses = Map<string, Array<DecoratedClass>>;
export interface ClassConstructor {
    new (...args: any): any;
    prototype: any;
    [key: string] : any;
} 
export type ClassDecorators<T extends DecoratorParameterType> = Map<Function, Map<string, Array<DecoratorMetadata<T>>>>;
export type DecoratorMetadata<T extends DecoratorParameterType> = {prop: string, arg: T};
export type DecoratorParameterType = CycleType | string;

export function overwriteCycle(which: CycleType, ctor: ClassConstructor) {
    const sealedKey = `${SEALED}${which}`;
    if (ctor[sealedKey]) {
        return ;
    }
    const key = `${INITIAL_CALLBACK}${which}`;
    if (!ctor[key] && ctor[which]) {
        ctor[key] = ctor[which];
    }

    ctor[which] = function(...args: Array<any>) {
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
    }
    ctor[sealedKey] = true;

}

export function Watcher(prop: string): any {
    return function(ctor: ClassConstructor, property: string) {
        if (!ctor[WATCHERS_CALLBACK]) {
            const callback = function(changes: {[key: string]: any}) {
                const watchers = __getDecorations(this.constructor.prototype, WATCHERS_KEY);
                const toRun = new Map<string, Array<string>>();
                watchers.filter(w => !!changes[w.arg]).forEach(w => {
                    if (!toRun.has(w.prop)) {
                        toRun.set(w.prop, []);
                    }
                    toRun.get(w.prop).push(w.arg);
                });
                Array.from(toRun.keys()).forEach(method => {
                    const args = toRun.get(method).reduce((acc, v) => Object.assign(acc, {[v]: changes[v]}), {});
                    this[method](args);
                });
            }
            ctor[WATCHERS_CALLBACK] = callback;
        }
        overwriteCycle('ngOnChanges', ctor);
        return __doPropDecoration(WATCHERS_KEY, prop, ctor, property);
    }
}

export function NgCycle(which: CycleType): any {
    return function(ctor: ClassConstructor, property: string) {
        overwriteCycle(which, ctor);
        return __doPropDecoration(CYCLES_KEY, which, ctor, property);
    }
}

export function NgAfterViewChecked() {
    return NgCycle('ngAfterViewChecked');
}

export function NgAfterContentChecked(): any {
    return NgCycle('ngAfterContentInit');
}

export function NgAfterContentInit(): any{
    return NgCycle('ngAfterContentInit');
}

export function NgDoCheck(): any {
    return NgCycle('ngDoCkeck');
}

export function NgOnChanges(): any {
    return NgCycle('ngOnChanges');
}

export function NgAfterViewInit(): any {
    return NgCycle('ngAfterViewInit');
}

export function NgOnDestroy(): any {
    return NgCycle('ngOnDestroy');
}

export function NgOnInit(): any {
    return NgCycle('ngOnInit');
}

export function getCycles<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}

export function getWatchers<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, WATCHERS_KEY);
}

function __doPropDecoration<T extends DecoratorParameterType>(decorationName: string, arg: T, ctor: ClassConstructor, property: string) {
    const c = ctor.constructor;
    let map: ClassDecorators<DecoratorParameterType> = Reflect.getOwnMetadata(DECORATORS, Object);

    if (!map) {
        map = new Map<ClassConstructor, Map<string, Array<DecoratorMetadata<DecoratorParameterType>>>>();
    }

    if (!map.get(c)) {
        map.set(c, new Map<string, Array<DecoratorMetadata<DecoratorParameterType>>>());
    }

    if (!Array.isArray(map.get(c).get(decorationName))) {
        map.get(c).set(decorationName, []);
    }
    map.get(c).get(decorationName).push({prop: property, arg: arg});

    Reflect.defineProperty(ctor, property, { enumerable: true, writable: true, configurable: true });
    Reflect.defineMetadata(DECORATORS, map, Object);
    return ctor;
}

export function __decorateProperty<T extends DecoratorParameterType>(decorationName: string, arg: T): any {
    return function(ctor: ClassConstructor, property: string) {
        return __doPropDecoration(decorationName, arg, ctor, property);
    };
}

export function __getDecorations<T extends DecoratorParameterType>(ctor: ClassConstructor, key: string): Array<DecoratorMetadata<T>> {
    if (ctor == null) {
        return [];
    }
    const decorators: ClassDecorators<T> = Reflect.getOwnMetadata(DECORATORS, Object);
    let result: Array<DecoratorMetadata<T>> = [];
    if (!decorators) {
        return [];
    }
    const decorations = decorators.get(ctor.constructor);
    if (decorations) {
        result = decorations.get(key) || [];
    }

    return result.concat(__getDecorations(Object.getPrototypeOf(ctor), key));
}
