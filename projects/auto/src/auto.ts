import {
   ChangeDetectorRef,
   ErrorHandler,
   inject,
   InjectFlags,
} from "@angular/core";

class AutoObserver {
   private changeDetector = inject(ChangeDetectorRef);
   private errorHandler = inject(ErrorHandler);
   next() {
      this.changeDetector.markForCheck();
   }
   error(error: unknown) {
      this.errorHandler.handleError(error);
   }
}

const ngDoCheck = "ngDoCheck";
const ngOnDestroy = "ngOnDestroy";
const methods = [
   "ngOnChanges",
   "ngOnInit",
   ngDoCheck,
   "ngAfterContentInit",
   "ngAfterContentChecked",
   "ngAfterViewInit",
   "ngAfterViewChecked",
   ngOnDestroy,
];
const ɵNG_FAC_DEF = "ɵfac";
const define = Object.defineProperty;

function setupLifecycles(target: any) {
   for (const method of methods) {
      const fn = target[method];
      target[method] = function (arg?: any) {
         fn?.call(this, arg);
         for (const dep of this[auto]) {
            dep[method]?.(arg);
         }
      };
   }
}

function assertDepsAreValid(deps: Set<any>) {
   const { context } = inject(ChangeDetectorRef, InjectFlags.Self) as any;
   for (const dep of Array.from(deps)) {
      const targetContext = depsContext.get(dep)?.context;
      if (targetContext !== context) {
         deps.delete(dep);
         if (depsContext.has(targetContext)) {
            depsContext.get(targetContext).add(dep);
         } else {
            throw new Error("Invalid context");
         }
      }
   }
}

function create(fn: Function) {
   return function (...args: any[]) {
      const deps = new Set();
      const previous = setDeps(deps);
      try {
         const instance = fn(...args);
         depsContext.set(instance, deps);
         assertDepsAreValid(deps);
         define(instance, auto, { value: deps });
         define(instance, observer, {
            value: new AutoObserver(),
         });
         return instance;
      } finally {
         setDeps(previous);
      }
   };
}

const depsContext = new WeakMap();

export function Auto() {
   return function (target: any) {
      for (const name of features) {
         const meta = getMetaKey(target.prototype, name);
         if (meta.size) {
            feature.get(name).call(null, target, name);
         }
      }
      if (target[ɵNG_FAC_DEF]) {
         setupLifecycles(target.prototype);
         const factory = target[ɵNG_FAC_DEF];
         define(target, ɵNG_FAC_DEF, {
            get(): any {
               return create(factory);
            },
         });
      } else {
         return new Proxy(target, {
            defineProperty(
               target: any,
               p: string | symbol,
               attributes: PropertyDescriptor
            ): boolean {
               if (p === ɵNG_FAC_DEF) {
                  setupLifecycles(target.prototype);
                  const factory = attributes.get?.();
                  attributes.get = function () {
                     return create(factory);
                  };
               }
               return Reflect.defineProperty(target, p, attributes);
            },
            construct(
               target: any,
               argArray: any[],
               newTarget: Function
            ): object {
               const instance = Reflect.construct(target, argArray, newTarget);
               depsContext.set(
                  instance,
                  inject(ChangeDetectorRef, InjectFlags.Self)
               );
               if (!target.hasOwnProperty(ɵNG_FAC_DEF)) {
                  deps?.add(instance);
               }
               return instance;
            },
         });
      }
   };
}

let deps: Set<any> | undefined;

function setDeps(value?: Set<any>): Set<any> | undefined {
   const previous = deps;
   deps = value;
   return previous;
}

const auto = Symbol();
const check = Symbol();
const subscribe = Symbol();
const observer = Symbol();
const previous = Symbol();
const unsubscribe = Symbol();

const metadata = new WeakMap();
const features = [check, subscribe, unsubscribe];

function ensureKey(target: any, key?: PropertyKey) {
   return target.get(key) ?? target.set(key, new Map()).get(key);
}

function getMetaKey(target: any, key: PropertyKey, property?: PropertyKey) {
   return ensureKey(ensureKey(ensureKey(metadata, target), key), property);
}

function setMetaKey(
   target: any,
   meta: PropertyKey,
   value: any,
   property?: PropertyKey
) {
   getMetaKey(target, meta, property).set(value);
}

const feature = new Map();

function wrap(
   target: any,
   key: string,
   fn: (this: any, ...args: any[]) => void
) {
   const origFn = target[key];
   target[key] = function (...args: any[]) {
      fn.apply(this, args);
      return origFn?.apply(this, args);
   };
}

function checkFeature(target: any, check: symbol) {
   const map = getMetaKey(target.prototype, check);
   wrap(target.prototype, ngDoCheck, function () {
      const cache = getMetaKey(this, previous, check);
      for (const key of map.keys()) {
         const currentValue = this[key];
         const previousValue = cache.get(key);
         if (currentValue !== previousValue) {
            cache.set(key, currentValue);
            this[observer].next();
         }
      }
   });
}

function subscribeFeature(target: any, subscribe: symbol) {
   const map = getMetaKey(target.prototype, subscribe);
   wrap(target.prototype, ngDoCheck, function () {
      const previousMap = getMetaKey(this, previous, subscribe);
      for (const key of map.keys()) {
         const currentValue = this[key];
         const previousValue = previousMap.get(key);
         if (currentValue !== previousValue) {
            previousMap.set(key, currentValue);
            const subscriptionMap = getMetaKey(this, previous, unsubscribe);
            subscriptionMap.get(key)?.unsubscribe?.();
            subscriptionMap.set(key, currentValue?.subscribe(this[observer]));
         }
      }
   });
   wrap(target.prototype, ngOnDestroy, function () {
      const previousMap = getMetaKey(this, previous, subscribe);
      for (const key of getMetaKey(this, previous, unsubscribe).keys()) {
         previousMap.get(key)?.unsubscribe?.();
      }
   });
}

function unsubscribeFeature(target: any, unsubscribe: symbol) {
   wrap(target.prototype, ngOnDestroy, function () {
      for (const key of getMetaKey(target.prototype, unsubscribe).keys()) {
         this[key]?.complete?.();
         this[key]?.unsubscribe?.();
      }
   });
}

function createDecorator(
   meta: PropertyKey,
   featureFn: any
): () => PropertyDecorator {
   return function () {
      return function (target: any, key: PropertyKey) {
         setMetaKey(target, meta, key);
         feature.set(meta, featureFn);
      };
   };
}

export const Check = createDecorator(check, checkFeature);
export const Subscribe = createDecorator(subscribe, subscribeFeature);
export const Unsubscribe = createDecorator(unsubscribe, unsubscribeFeature);
