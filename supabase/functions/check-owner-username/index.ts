/** Independent review-only entry. Online Auth, active Master authorization and expiry are mandatory. */
import {createOwnerUsernameHandler} from '../_diagnostics/owner-username-core.mjs';
import {ownerDependencies} from '../_diagnostics/owner-runtime.ts';
Deno.serve(createOwnerUsernameHandler(ownerDependencies(name=>Deno.env.get(name))));
