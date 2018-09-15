/*
 * sri sri guru gauranga jayatah
 */
import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
import CDRAllotment from "@/views/CDRAllotment";
import SQRAllotment from "@/views/SQRAllotment";
import TEAllotment from "@/views/TEAllotment";
import TFCAllotment from "@/views/TFCAllotment";
import QCAllotment from "@/views/QCAllotment";

Vue.use(Router);

export default new Router({
  mode: "history",
  routes: [
    { path: "*", redirect: "/" },
    {
      path: "/",
      name: "home",
      component: Home
    },
    {
      path: "/cdr/allot",
      name: "cdr-allotment",
      component: CDRAllotment
    },
    {
      path: "/sqr/allot",
      name: "sqr-allotment",
      component: SQRAllotment
    },
    {
      path: "/te",
      name: "TE",
      component: TEAllotment
    },
    {
      path: "/te/fc/allot",
      name: "TFC Allotment",
      component: TFCAllotment
    },
    {
      path: "/qc",
      name: "qc",
      component: QCAllotment
    }
  ]
});
