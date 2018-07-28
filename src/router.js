/*
 * sri sri guru gauranga jayatah
 */
import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
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
      path: "/qc",
      name: "qc",
      component: QCAllotment
    }
  ]
});
