/*
 * sri sri guru gauranga jayatah
 */
import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
import QCAllotment from "@/views/QCAllotment";
import TEAllotment from "@/views/TEAllotment";
import TFCAllotment from "@/views/TFCAllotment";

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
