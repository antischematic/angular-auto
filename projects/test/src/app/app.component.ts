import {
   ChangeDetectionStrategy,
   ChangeDetectorRef,
   Component,
   inject,
   Injectable,
   Injector
} from "@angular/core";
import {Auto, Check, Subscribe} from "@mmuscat/angular-auto";
import {interval} from "rxjs";
import {tap} from "rxjs/operators";

@Auto()
@Injectable()
export class Service {
   object = new Composable("service")

   ngOnDestroy() {
      console.log('destroy')
   }
}


@Auto()
class Composable {
   changeDetectorRef = inject(ChangeDetectorRef)

   ngOnInit() {
      console.log('nested init', this.context)
   }

   ngOnDestroy() {
      console.log('nested destroy', this.context)
   }

   constructor(private context: string) {
      console.log('context', this)
   }
}

@Auto()
@Component({
   selector: "app-root",
   templateUrl: "./app.component.html",
   styleUrls: ["./app.component.css"],
   providers: [Service],
   changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
   title = "test";

   service = inject(Service)

   object = new Composable("component")

   @Check()
   count = 0;

   @Subscribe()
   increment = interval(1000).pipe(tap(() => this.count++));

   constructor(cdr: ChangeDetectorRef) {
      console.log('cdr', cdr)
      const injector = inject(Injector)
      setTimeout(() => {
         console.log(injector.get(AppComponent))
      })
   }
}
