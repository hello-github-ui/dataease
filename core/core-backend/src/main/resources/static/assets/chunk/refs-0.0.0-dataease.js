import {as as c} from "./vue-0.0.0-dataease.js";

const e = (...a) => s => {
    a.forEach(o => {
        c(o) ? o(s) : o.value = s
    })
};
export {e as c};
