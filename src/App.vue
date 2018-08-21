<template>
  <div id="app">
    <nav class="nav nav-pills nav-justified">
      <router-link class="nav-item nav-link" to="/te">Allot TE</router-link>
      <router-link class="nav-item nav-link" to="/fc">Allot FC</router-link>
      <router-link class="nav-item nav-link" to="/se">Allot SE</router-link>
      <router-link class="nav-item nav-link" to="/qc">Allot QC</router-link>
    </nav>
    <router-view/>
  </div>
</template>
