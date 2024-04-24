export type CycleType = 'ngOnDestroy' | 'ngAfterViewInit' | 'ngOnChanges' | 'ngOnInit' | 'ngDoCkeck' | 'ngAfterContentInit' | 'ngAfterContentChecked' | 'ngAfterViewChecked';
export declare const DESTROY_CALLBACK = "--destroy-callback--";
export type DecoratedClass = {
    ctor: ClassConstructor;
    args: Array<any>;
};
export type DecoratedClasses = Map<string, Array<DecoratedClass>>;
export interface ClassConstructor {
    new (...args: any): any;
    prototype: any;
    [key: string]: any;
}
export type ClassDecorators<T extends DecoratorParameterType> = Map<Function, Map<string, Array<DecoratorMetadata<T>>>>;
export type DecoratorMetadata<T extends DecoratorParameterType> = {
    prop: string;
    arg: T;
};
export type DecoratorParameterType = CycleType | string;
export declare function overwriteCycle(which: CycleType, ctor: ClassConstructor): void;
export declare function Watcher(prop: string): any;
export declare function NgCycle(which: CycleType): any;
export declare function NgAfterViewChecked(): any;
export declare function NgAfterContentChecked(): any;
export declare function NgAfterContentInit(): any;
export declare function NgDoCheck(): any;
export declare function NgOnChanges(): any;
export declare function NgAfterViewInit(): any;
export declare function NgOnDestroy(): any;
export declare function NgOnInit(): any;
export declare function getCycles<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>>;
export declare function getWatchers<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>>;
export declare function __decorateProperty<T extends DecoratorParameterType>(decorationName: string, arg: T): any;
export declare function __getDecorations<T extends DecoratorParameterType>(ctor: ClassConstructor, key: string): Array<DecoratorMetadata<T>>;
