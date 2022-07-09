import { Auto, Check, Subscribe, Unsubscribe } from "./auto";
import {
   ChangeDetectionStrategy,
   ChangeDetectorRef,
   Component, ElementRef, inject,
   Injectable, InjectionToken,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BehaviorSubject, Subject, Subscription } from "rxjs";
import createSpy = jasmine.createSpy;
import {By} from "@angular/platform-browser";

describe("Auto", () => {
   beforeEach(() => {
      TestBed.configureTestingModule({
         providers: [
            {
               provide: ChangeDetectorRef,
               useValue: {
                  markForCheck: createSpy("markForCheck"),
               },
            },
            {
               provide: ElementRef,
               useValue: {
                  nativeElement: {}
               }
            }
         ],
      });
   });

   it("should decorate class", () => {
      @Auto()
      @Component({ template: `` })
      class MyComponent {}

      expect(MyComponent).toBeTruthy();
   });

   describe("Check", () => {
      it("should decorate", () => {
         @Auto()
         class MyComponent {
            @Check()
            count = 0;
         }
         expect(MyComponent).toBeTruthy();
      });

      it("should mark for check", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Check()
            count = 0;
         }
         const test = TestBed.inject(AutoTest);
         const changeDetector = TestBed.inject(ChangeDetectorRef);

         test.count = 10;
         // @ts-expect-error
         test.ngDoCheck();

         expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);
      });
   });

   describe("Subscribe", () => {
      it("should decorate", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class MyComponent {
            @Subscribe()
            count = new BehaviorSubject(0);
         }
         expect(MyComponent).toBeTruthy();
      });

      it("should subscribe", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Subscribe()
            count = new BehaviorSubject(0);
         }
         const test = TestBed.inject(AutoTest);

         spyOn(test.count, "subscribe").and.callThrough();
         // @ts-expect-error
         test.ngDoCheck();

         expect(test.count.subscribe).toHaveBeenCalledTimes(1);
      });

      it("should switch subscriptions", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Subscribe()
            count = new BehaviorSubject(0);
         }
         const test = TestBed.inject(AutoTest);
         const previous = test.count;

         // @ts-expect-error
         test.ngDoCheck();
         expect(previous.observers.length).toBe(1);

         test.count = new BehaviorSubject(0);
         spyOn(test.count, "subscribe").and.callThrough();
         // @ts-expect-error
         test.ngDoCheck();

         expect(previous.observers.length).toBe(0);
         expect(test.count.subscribe).toHaveBeenCalledTimes(1);
         expect(test.count.observers.length).toBe(1);
      });

      it("should mark for check", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Subscribe()
            count = new BehaviorSubject(0);
         }
         const test = TestBed.inject(AutoTest);
         const changeDetector = TestBed.inject(ChangeDetectorRef);

         // @ts-expect-error
         test.ngDoCheck();
         expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);

         test.count.next(10);
         test.count.next(20);
         test.count.next(30);

         expect(changeDetector.markForCheck).toHaveBeenCalledTimes(4);
      });

      it("should unsubscribe", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Subscribe()
            count = new BehaviorSubject(0);
         }
         const test = TestBed.inject(AutoTest);

         // @ts-expect-error
         test.ngDoCheck();
         expect(test.count.observers.length).toBe(1);

         TestBed.resetTestingModule();
         expect(test.count.observers).toBe(null as any);
      });
   });

   describe("Unsubscribe", () => {
      it("should decorate", () => {
         @Auto()
         class AutoTest {
            @Unsubscribe()
            count = new Subscription();
         }
         expect(AutoTest).toBeTruthy();
      });
      it("should dispose when destroyed", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            @Unsubscribe()
            count = new Subject();
         }
         const autoTest = TestBed.inject(AutoTest);

         // @ts-expect-error
         autoTest.ngDoCheck();

         spyOn(autoTest.count, "complete");
         spyOn(autoTest.count, "unsubscribe");

         TestBed.resetTestingModule();

         expect(autoTest.count.complete).toHaveBeenCalledTimes(1);
         expect(autoTest.count.unsubscribe).toHaveBeenCalledTimes(1);
         expect(autoTest.count.complete).toHaveBeenCalledBefore(
            autoTest.count.unsubscribe
         );
      });
   });

   it("should allow null values", () => {
      @Auto()
      @Injectable({ providedIn: "root" })
      class AutoTest {
         @Unsubscribe()
         subscription = null;

         @Subscribe()
         source = null;

         @Check()
         value = null;
      }
      const autoTest = TestBed.inject(AutoTest);
      // @ts-expect-error
      autoTest.ngDoCheck();
      TestBed.resetTestingModule();
      expect(autoTest).toBeTruthy();
   });

   describe("Component", () => {
      it("should create", () => {
         @Auto()
         @Component({
            template: `{{ count }}`,
            changeDetection: ChangeDetectionStrategy.OnPush,
         })
         class MyComponent {
            @Check()
            count = 0;

            @Subscribe()
            count$ = new BehaviorSubject(0);

            @Unsubscribe()
            subscription = new Subscription();
         }
         TestBed.configureTestingModule({
            declarations: [MyComponent],
         });
         const fixture = TestBed.createComponent(MyComponent);
         const changeDetector =
            fixture.debugElement.injector.get(ChangeDetectorRef);
         spyOn(changeDetector, "markForCheck").and.callThrough();
         spyOn(fixture.componentInstance.count$, "subscribe").and.callThrough();
         spyOn(
            fixture.componentInstance.subscription,
            "unsubscribe"
         ).and.callThrough();
         fixture.detectChanges();
         fixture.componentInstance.count = 10;
         fixture.detectChanges();
         fixture.destroy();
         expect(
            fixture.componentInstance.count$.subscribe
         ).toHaveBeenCalledTimes(1);
         expect(
            fixture.componentInstance.subscription.unsubscribe
         ).toHaveBeenCalledTimes(1);
         expect(fixture.debugElement.nativeElement.innerText).toBe("10");
      });
   });

   describe("Composition", () => {
      let spy: jasmine.Spy;
      const methods = [
         "ngOnChanges",
         "ngOnInit",
         "ngDoCheck",
         "ngAfterContentInit",
         "ngAfterContentChecked",
         "ngAfterViewInit",
         "ngAfterViewChecked",
         "ngOnDestroy",
      ] as const;

      beforeEach(() => {
         spy = createSpy();
      });

      @Auto()
      class Composable {
         ngOnChanges() {
            spy("ngOnChanges");
         }
         ngOnInit() {
            spy("ngOnInit");
         }
         ngDoCheck() {
            spy("ngDoCheck");
         }
         ngAfterContentInit() {
            spy("ngAfterContentInit");
         }
         ngAfterContentChecked() {
            spy("ngAfterContentChecked");
         }
         ngAfterViewInit() {
            spy("ngAfterViewInit");
         }
         ngAfterViewChecked() {
            spy("ngAfterViewChecked");
         }
         ngOnDestroy() {
            spy("ngOnDestroy");
         }
      }

      it("should decorate", () => {
         @Auto()
         class AutoTest {
            object = new Composable();
         }
         expect(AutoTest).toBeTruthy();
      });

      it("should compose lifecycle methods", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            constructor() {
               new Composable();
            }
         }
         const test = TestBed.inject(AutoTest);

         for (const method of methods) {
            // @ts-expect-error
            test[method]();
            expect(spy).toHaveBeenCalledOnceWith(method);
            spy.calls.reset();
         }
      });

      it("should compose lifecycle methods for each object", () => {
         @Auto()
         @Injectable({ providedIn: "root" })
         class AutoTest {
            constructor() {
               new Composable();
               new Composable();
            }
         }
         const test = TestBed.inject(AutoTest);

         for (const method of methods) {
            // @ts-expect-error
            test[method]();
            expect(spy).toHaveBeenCalledWith(method);
            expect(spy).toHaveBeenCalledTimes(2);
            spy.calls.reset();
         }
      });
      it("should throw when injecting root tokens", () => {
         const Token = new InjectionToken("Test", {
            factory() {
               return new Composable()
            }
         })
         @Auto()
         @Component({ template: ``, standalone: true })
         class Parent {
            token = TestBed.inject(Token)
         }

         expect(() => {
            TestBed.configureTestingModule({imports: [Parent]})
               .createComponent(Parent)
         }).toThrow(new Error("Invalid context"))
      })
      it("should use correct context", () => {
         const Token = new InjectionToken("Test")

         @Component({ selector: 'child', template: ``, standalone: true })
         @Auto()
         class Child {
            token = inject(Token)
            parent = inject(Parent)
         }

         @Auto()
         @Component({ template: `<child></child>`, standalone: true, imports: [Child], providers: [{ provide: Token, useFactory: () => new Composable() }] })
         class Parent {}
         const parent = TestBed.configureTestingModule({imports: [Parent]})
            .createComponent(Parent)
         const child = parent.debugElement.query(By.directive(Child))

         spy.calls.reset()
         child.componentInstance.ngOnInit()
         expect(spy).not.toHaveBeenCalled()

         // @ts-expect-error
         parent.componentInstance.ngOnInit()
         expect(spy).toHaveBeenCalledOnceWith("ngOnInit")
      })
   });
});
