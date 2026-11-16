/** Proposal only. No automatic deployment or activation. */
import {createAdminHandler} from './runtime.ts';
Deno.serve(createAdminHandler(name=>Deno.env.get(name)));
