import 'reflect-metadata';

import { interval } from 'rxjs';
import { connectable } from '../ts/connect.mjs';
import { CycleType, NgOnDestroy, NgOnInit, Watcher } from '../ts/decorators.mjs';

class ParentClass {
    public x = 0;
    public ngOnInit() {
        expect(this.x).toEqual(0);
        this.x++;
    }
}

class Child1Class extends ParentClass {
    public override ngOnInit() {
        expect(this.x).toEqual(0);
        super.ngOnInit();
        expect(this.x).toEqual(1);
        this.x++;
    }
}

class Child2Class extends Child1Class {
    @NgOnInit()
    private _initMe() {
        expect(this.x).toEqual(2);
        this.x++;
    }
}

class BaseComponent {
    protected connect = connectable(this);
}

class ComponentA extends BaseComponent {
    public x = 0;

    public init() {
        this.connect(interval(1000), x => this.x = x);
    }

    @NgOnDestroy()
    private _destroyMe() {
        this.x++;
    }

    private ngOnDestroy() {
        this.x++;
    }
}

class ComponentB {
    public y = 0;
    public recordedChanges: Array<any> = [];
    @NgOnInit()
    private _initMe() {
        expect(this.y).toEqual(1);
        this.y++;
    }

    @NgOnInit()
    private _initMe2() {
        expect(this.y).toEqual(2);
        this.y++;
    }

    @NgOnDestroy()
    private _destroyMe() {
        expect(this.y).toEqual(4);
    }

    private ngOnDestroy() {
        this.recordedChanges = [];
        expect(this.y).toEqual(3);
        this.y++;
    }

    private ngOnChanges(changes: {[key: string]: any}) {
        this.recordedChanges.push(changes);
    }

    @Watcher('a')
    private _aChanges(changes: {[key: string]: any}) {
        this.recordedChanges.push(changes);
    }

    @Watcher('a')
    @Watcher('b')
    private _abChanges(changes: {[key: string]: any}) {
        this.recordedChanges.push(changes);
    }

    private ngOnInit() {
        this.y++;
    }
}

const executeCycle = (instance: any, which: CycleType, args?: Array<any>) => {
    if (Object.getPrototypeOf(instance)[which]) {
        instance[which](...(args || []));
    }
}

describe('Test the library', () => {
    it('tests the connectivity', () => {
        const clock = jasmine.clock().install();
        const a = new ComponentA();
        a.init();
        clock.tick(3500);
        expect(a.x).toEqual(2);
        executeCycle(a, 'ngOnDestroy');
        expect(a.x).toEqual(4);
        clock.tick(3500);
        expect(a.x).toEqual(4);
        clock.uninstall();
    });

    const _doAssert = (val: string, assert: string) => {
        if (!!assert) {
            expect(val).toEqual(assert);
        }
        else {
            expect(val).toBeUndefined();
        }
    }

    const _assert = (x: ComponentB, length: number, idx: number, a: string, b: string) => {
        expect(x.recordedChanges.length).toEqual(length);
        _doAssert(x.recordedChanges[idx].a, a);
        _doAssert(x.recordedChanges[idx].b, b);
    }

    it('tests the annotations', async () => {
        const x = new ComponentB();
        executeCycle(x, 'ngOnInit');
        expect(x.y).toEqual(3);
        executeCycle(x, 'ngOnChanges', [{'a': 'valuea1', 'b': 'valueb1'}]);
        _assert(x, 3, 0, 'valuea1', 'valueb1');
        _assert(x, 3, 1, 'valuea1', undefined as any);
        _assert(x, 3, 2, 'valuea1', 'valueb1');
        executeCycle(x, 'ngOnChanges', [{'b': 'valueb1'}]);
        _assert(x, 5, 3, undefined as any, 'valueb1');
        _assert(x, 5, 4, undefined as any, 'valueb1');
        executeCycle(x, 'ngOnChanges', [{'a': 'valuea2'}]);
        _assert(x, 8, 5, 'valuea2', undefined as any);
        _assert(x, 8, 6, 'valuea2', undefined as any);
        _assert(x, 8, 7, 'valuea2', undefined as any);
        executeCycle(x, 'ngOnDestroy');
        expect(x.recordedChanges.length).toEqual(0);
    });

    it('test inheritance', async () => {
        const x = new Child2Class();
        executeCycle(x, 'ngOnInit');
        expect(x.x).toEqual(3);
    });
});
