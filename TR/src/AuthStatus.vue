<script setup>
import LoadingIndicator from './LoadingIndicator.vue';
import { useAuth } from './auth';

const { user, isCurrentUserLoaded, signIn, signOut } = useAuth();
</script>

<template>
  <span v-if="!isCurrentUserLoaded" class="flex items-center gap-2">
    <LoadingIndicator />
    <span>Waiting for auth…</span>
  </span>
  <template v-else-if="user">
    <span>
      Signed in as {{ user.displayName }} |
      <button class="underline decoration-dotted" @click="signOut">
        Sign Out
      </button>
    </span>
  </template>
  <button v-else class="underline decoration-dotted" @click="signIn">
    Sign In
  </button>
</template>
