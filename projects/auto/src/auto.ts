import { ChangeDetectorRef, ErrorHandler, inject } from "@angular/core";

type Constructor = new (...args: any[]) => any;

class AutoObserver {
   next() {
      this.changeDetector.markForCheck();
   }
   error(error: unknown) {
      this.errorHandler.handleError(error);
   }
   constructor(
      private changeDetector: ChangeDetectorRef,
      private errorHandler: ErrorHandler
   ) {}
}

const methods = ["ngOnChanges", "ngOnInit", "ngDoCheck", "ngAfterContentInit", "ngAfterContentChecked", "ngAfterViewInit", "ngAfterViewChecked", "ngOnDestroy"]

function setupLifecycles(target: any) {
   if (getMetaKey(target, detect).size) {
      for (const method of methods) {
         const fn = target[method]
         target[method] = function (arg?: any) {
            for (const key of getMetaKey(target, detect).keys()) {
               this[key]?.[method]?.(arg)
            }
            fn?.call(this, arg)
         }
      }
   }
}

export function Auto() {
   return function <T extends Constructor>(target: T) {
      const ngDoCheck = target.prototype.ngDoCheck
      target.prototype.ngDoCheck = function () {
         for (const key of getMetaKey(target.prototype, check).keys()) {
            const currentValue = this[key];
            const previousValue = getMetaKey(this, previous, check).get(key);
            if (currentValue !== previousValue) {
               getMetaKey(this, previous, check).set(key, currentValue);
               this[observer].next();
            }
         }
         for (const key of getMetaKey(target.prototype, subscribe).keys()) {
            const currentValue = this[key];
            const previousValue = getMetaKey(this, previous, subscribe).get(
               key
            );
            if (currentValue !== previousValue) {
               getMetaKey(this, previous, subscribe).set(key, currentValue);
               const subscriptionMap = getMetaKey(
                  this,
                  previous,
                  unsubscribe
               );
               subscriptionMap.get(key)?.unsubscribe?.();
               subscriptionMap.set(
                  key,
                  currentValue?.subscribe(this[observer])
               );
            }
         }
         ngDoCheck?.apply(this)
      }
      const ngOnDestroy = target.prototype.ngOnDestroy
      target.prototype.ngOnDestroy = function () {
         for (const key of getMetaKey(this, previous, unsubscribe).keys()) {
            getMetaKey(this, previous, unsubscribe).get(key)?.unsubscribe?.();
         }
         for (const key of getMetaKey(target.prototype, unsubscribe).keys()) {
            this[key]?.complete?.();
            this[key]?.unsubscribe?.();
         }
         ngOnDestroy?.apply(this)
      }
      setupLifecycles(target.prototype)
      return new Proxy(target, {
         construct(target: T, argArray: any[], newTarget: Function): object {
            const instance = Reflect.construct(target, argArray, newTarget)
            Object.defineProperty(instance, observer, { value: new AutoObserver(
               inject(ChangeDetectorRef),
               inject(ErrorHandler)
            )})
            return instance
         }
      })
   };
}

const check = Symbol();
const subscribe = Symbol();
const observer = Symbol();
const previous = Symbol();
const unsubscribe = Symbol();
const detect = Symbol();

const metadata = new WeakMap();

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

function createDecorator(meta: PropertyKey): () => PropertyDecorator {
   return function () {
      return function (target: any, key: PropertyKey) {
         setMetaKey(target, meta, key);
      };
   }
}

export const Check = createDecorator(check)
export const Subscribe = createDecorator(subscribe)
export const Unsubscribe = createDecorator(unsubscribe)
export const Detect = createDecorator(detect)
