# Auto decorators for Angular

```ts
@Auto()
@Component({
   template: `{{ count }}`,
   changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
   @Input()
   count = 0;

   object = new Resource()

   @Subscribe()
   autoIncrement = interval(1000).pipe(
      tap((value) => this.count = value + 1)
   );

   @Unsubscribe()
   subscription = new Subscription();

   ngOnInit() {
      console.log("I am called!")
   }
}
```

```ts
@Auto()
export class Resource {
   private http = inject(HttpClient)

   @Check()
   value
   
   ngOnInit() {
      console.log("I am also called!")
   }

   fetch(params) {
      this.http.get(endpoint, params)
         .subscribe((value) => this.value = value)
   }
}
```

## Decorators

### `Auto`

Automatically compose the decorated class. Lifecycle hooks are called for any `Auto` decorated object created inside a field initializer or class constructor.

### `Check`

Automatically check when the decorated value and mark the view dirty when it changes. Use with `OnPush` change detection strategy.

### `Subscribe`

Automatically subscribe to the decorated observable during `ngDoCheck` and mark the view dirty whenever a value is emitted. Use with `OnPush` change detection strategy.
Assigning new values will automatically cancel the previous subscription. Subscriptions are automatically unsubscribed when the context is destroyed.

### `Unsubscribe`

Automatically unsubscribe the decorated subject or subscription during `ngOnDestroy`. You must still manually call `complete` and/or `unsubscribe` before assigning a new value to prevent memory leaks.
