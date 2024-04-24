# Ng Hooks

**Or, implementing angular lifecycle hooks the proper way.**

This library contains a few decorators which will make extending components
practical and easy. 

## Install

```bash
npm install --save ng-annotated-hooks
```

## Background

***Why is there a need***

Unfortunatelly, Angular is not really oriented via extending components. I
heard a lot of times the question "why do you need to extend a component?"
during some interviews or during working on a project. Well, every time the
answer is quite simple: there are lots of cases where inherinting from a base
component is very usefull: 

* I want to have a unified API (I want all my components for example to use a
  label input or to use an ID input). Also, I want this ID to be initialized
  by default with an UID if not defined by the user. 
* I want proper observables subscribtions handling without a lot of
  boilerplate code and of course without repeating myself over and over again
  (and yes, I also want to unsubscribe even if I know that the service that
  I'm subscribing to is just a REST call).
* I want to have some common behavior (for example I would like a dropdown
  component and an autocomplete component to have a common behaviour regarding
  the data source and the sharing of the model).
* I want to be able to define abstract components to be able to reuse common
  logic

These are just a few examples where inheritance is the most straight forward
solution.


***Counter-arguments / other options / ...***

Between the arguments that I've heard since I'm doing Angular development, the
only valid one was "use object composition". The others like finding different
more complicated solutions just because the code would otherwise be more
complicated are not even worth discussing. 

Regarding object composition, I've tried this and it poses one major issue:
when it comes to modern developing tools, you are left on your own. There is
no IDE nor LSP server for angular which will properly interpret something like
this:

```javascript
const A = {
    method1(): void{
        ...
    }
}

const B = {
    method2(): void{
        ...
    }
}

const c = Object.create(Object.assign({}, A, B));

```

Following such a code, `c` will be of type `any`, because `Object.create`
returns `any`. So, good luck finding definitions, references, and so on. Of
course, a solution would be to have a lot of interfaces, but this is a poor
solution compared with just extending the damn class. That is the
straightforward solution. 

***Challenges***

But, when extending components in Angular, the main issue is that if you have
one of the lifecycle hooks defined in a base class, when you want to reuse it
in a child class, you need to be aware and specically call `super` in order to
keep all the component functionality.

Let's say that you want to have some observable subscribtions handling in a
`BaseComponent`, like this:

```typescript
export class BaseComponent {
...
    protected ngOnDestroy() {
        // automatically call unsubscribtion logic when the component is
        // getting terminated.
    }
...
}

export class MyFirstComponent extends BaseComponent {
    protected ngOnDestroy() {
        super.ngOnDestroy();
        // Without the previous line, sudenly, you will have memory leaks.
        // This means that any component extending BaseComponent needs to be
        // aware of the internals of BaseComponent in order to not break some
        // logic.
    }
}
```

You can see clearly the issue. 

## ng-annotated-hooks solution

In order to solve this issues, this library provides a few decorators.

### `NgCycle` annotation

This annotation will solve the inheritance issues.

***Angular way***

```typescript
export class ParentComponent implements OnInit {
    @Input() public id: string;
    ngOnInit() {
        if (!id) {
            this.id = UUID();
        }
    }
}

export class ChildComponent extends ParentComponent implements OnInit {
    private _myProperty: string;
    ngOnInit() {
        super.ngOnInit(); //problematic - see above
        this._myProperty = 'value';
    }
}

```

***ng-annotated-hooks way***

```typescript
export class ParentComponent extends BaseComponent {
    @Input() public id: string;
    @NgCycle('ngOnInit')
    private __initParentComponent__() {
        if (!id) {
            this.id = UUID();
        }
    }
}

@Component({
    ...
})
export class ChildComponent extends ParentComponent {
    private _myProperty: string;
    @NgCycle('ngOnInit')
    private __initChildComponent__() {
        this._myProperty = 'value';
    }
}

```

You can clearly notice how in this paradigm, the child component does not know
and does not care about any of the internals of BaseComponent. If the name of
the method annotated with `@NgCycle` is too generic, the bulet-proof solution
is to just make the methods private. Like this, if you overwrite them in a
child class by mistake, you will get a compilation error. The methods don't
have to be public.

Based on this method, there are, there are 8 annotations that can be used
directly:

* `@NgOnInit()` for methods executed on the `ngOnInit` lifecycle hook
* `@NgOnChanges()` for methods executed on the `ngOnChanges` lifecycle hook
* `@NgAfterViewInit()` for methods executed on the `ngAfterViewInit` lifecycle hook
* `@NgAfterContentInit()` for methods executed on the `ngAfterContentInit` lifecycle hook
* `@NgAfterViewChecked()` for methods executed on the `ngAfterViewChecked` lifecycle hook
* `@NgAfterContentChecked()` for methods executed on the `ngAfterContentCheckedgOnInit` lifecycle hook
* `@NgDoCheck()` for methods executed on the `ngDoCheck` lifecycle hook
* `@NgOnDestroy()` for methods executed on the `ngOnDestroy` lifecycle hook

Based on these annotations, the previous example can be re-written like this:

```typescript
export class ParentComponent extends BaseComponent {
    @Input() public id: string;

    @NgOnInit()
    private __initParentComponent__() {
        if (!id) {
            this.id = UUID();
        }
    }
}

@Component({
    ...
})
export class ChildComponent extends ParentComponent {
    private _myProperty: string;

    @NgOnInit()
    private __initChildComponent__() {
        this._myProperty = 'value';
    }
}

```

You can use any of these annotations together with the angular way. So, for
example, this will work as expected:

```typescript
export class MyComponent implements OnInit {
    @NgOnInit()
    private _initMe() {
        console.log('hey, I am running with the ngOnInit lifecycle hook');
    }

    public ngOnInit() {
        console.log('hey, I am also running with the ngOnInit lifecycle hook');
    }
}
```

Both functions will be ran when ngOnInit is ran. The only thing to remember is
that ngOnInit function always runs first. This is to say that the original
angular hook function will always be ran before the annotated methods inside
the respective lifecycle hook. 

Regarding the order in which the other methods are called, this depends on the
compiler. But at the moment of this writting, the order is from top to bottom
in your class. 

So, considering this example:

```typescript
export class MyComponent implements NgOnInit {
    @NgOnInit()
    private _initMe() {
        console.log('I am the second ran method when ngOnInit is on');
    }

    public ngOnInit() {
        console.log('I am the first ran method when ngOnInit is on')
    }

    private _anotherInit() {
        console.log('I am the third method ran when ngOnInit is on');
    }
}
```

As you can see, the first method executed is always the original lifecycle
method (in this example `ngOnInit`). Then the first defined method annotated
with `@NgOnInit` (`_initMe`) gets executed, and then the second annotated
method (`_anotherInit`).

### Watcher annotation

How many times did you write or encounter this in your angular applications?

```typescript
@Component({...})
export class MyComponent implements OnChange {
    ngOnChange(changes: SimpleChanges) {
        if (changes['input1']) {
            // do stuff related with input1
        }

        if (changes['input2']) {
            // do stuff related with input2
        }
    }
}
```

This looks ugly, right? 

Check out a better way of doing it via `NgHooks`, using the `Watcher`
annotation:

```typescript
@Component({...})
export class MyComponent {
    @Watcher('input1')
    private _input1Changed(c: SimpleChanges) {
        // do stuff related to input1 changing.
    }

    @Watcher('input2')
    private _input2Changed(c: SimpleChanges) {
        // do stuff related to input2 changing.
    }
}
```

Much, much nicer, right? You can also watch for more than one input changing,
like this:

```typescript
@Component({...})
export class MyComponent {
    @Watcher('input1')
    @Watcher('input2')
    private _input1or2Changed(c: SimpleChanges) {
        // do stuff related with input1 or input2 changing.
    }
}
```

### Handling of Observables

By using `ng-annotated-hooks`, you can also auto handle the observables, without any
boilerplate code. 

In order to have components that are subscribtion safe, you have to call the
`connectable` method one time to init the connectable context for your
component, then you can use the result of that call to connect to observables,
like this:

```typescript
export class SubscribtionSafeComponent {
    private _connect = connectable(this);
    @ViewChild('myButton') private _myButton: ElementRef;

    @NgOnInit()
    private _initMe() {
        this._connect(interval(1000), x => console.log('another second gone...', x));
    }

    @NgAfterViewInit() {
        this._connect(fromEvent('click', this._myButton.nativeElement), () => console.log('my button was clicked'));
    }
}
```

By writing your component like this, you can forget about unsubscribing. The
subscribtions will be canceled (`unsubscribe()` will get called) every time
`ngOnDestroy` will get called for that method. Even if you define
`ngOnDestroy`, for example like this:

```typescript
export class SubscribtionSafeComponent implements OnDestroy {
    private _connect = connectable(this);

    @NgOnInit()
    private _initMe() {
        this._connect(interval(1000), x => console.log('another second gone', x));
    }

    public ngOnDestroy() {
        console.log('i really need to overwrite this lifecycle hook');
    }

    @NgOnDestroy()
    private _destroyMe() {
        console.log("although, maybe it's better via an annotation?");
    }
}
```

In this case, altough you define some destroy logic (via `ng-annotated-hooks`
annotations or by implementing `ngOnDestroy` method), the unsubscribe logic
still gets executed. This means that you won't have a memory leak when this
component gets removed from the DOM.

If you don't like adding the `_connect` property to each of your components,
you can have a `BaseComponent` declaring it, like this:

```typescript
export class BaseComponent {
    protected connect = connectable(this);
}

export class MyComponent extends BaseComponent {
    @NgOnInit()
    private _initMe() {
        this.connect(interval(1000), x => console.log('another second gone', x));
    }
}
```

The `connectable` method returns a generic method, meaning using the result
afterwards will not lead to losing the type checking from the typescript
compiler. 

```
export class MyComponent {
    private _connect = connectable(this);

    @NgOnInit() {
        this._connect(interval(1000), x => console.log(x.toLowerCase())); // this will produce a compilation error: Property 'toLowerCase' does not exist on type 'number'
    }
}
```

As you can see, using the `connectable` is also type safe.
