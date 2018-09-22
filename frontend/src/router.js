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
      component: Home
    },
    {
      path: "/te/allot",
      component: TEAllotment
    },
    {
      path: "/te/fc/allot",
      component: TFCAllotment
    },
    {
      path: "/qc/allot",
      component: QCAllotment
    }
  ]
});
