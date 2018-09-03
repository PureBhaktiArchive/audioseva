<template>
  <div id="app">
    <nav class="nav nav-pills nav-justified mt-3 mb-3">
      <router-link class="nav-item nav-link" to="/te">Allot TE</router-link>
      <router-link class="nav-item nav-link" to="/se">Allot SE</router-link>
      <router-link class="nav-item nav-link" to="/qc">Allot QC</router-link>
      <router-link class="nav-item nav-link" to="/fc">Allot FC</router-link>
    </nav>
    <router-view/>
  </div>
</template>
