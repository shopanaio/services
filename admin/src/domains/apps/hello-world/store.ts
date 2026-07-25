"use client";

import { useSyncExternalStore } from "react";
import { helloWorldAdminDescriptor } from "./descriptor";

export type HelloWorldInstallationStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "UNINSTALLED";

interface HelloWorldInstallationSnapshot {
  status: HelloWorldInstallationStatus;
  descriptors: readonly [typeof helloWorldAdminDescriptor] | readonly [];
}

const listeners = new Set<() => void>();
let snapshot: HelloWorldInstallationSnapshot = {
  status: "ACTIVE",
  descriptors: [helloWorldAdminDescriptor],
};

function publish(status: HelloWorldInstallationStatus): void {
  snapshot = {
    status,
    descriptors: status === "ACTIVE" ? [helloWorldAdminDescriptor] : [],
  };
  listeners.forEach((listener) => listener());
}

export function subscribeHelloWorldInstallation(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHelloWorldInstallationSnapshot() {
  return snapshot;
}

export function installHelloWorld(): void {
  publish("ACTIVE");
}

export function suspendHelloWorld(): void {
  publish("SUSPENDED");
}

export function resumeHelloWorld(): void {
  publish("ACTIVE");
}

export function uninstallHelloWorld(): void {
  publish("UNINSTALLED");
}

export function useHelloWorldInstallation() {
  return useSyncExternalStore(
    subscribeHelloWorldInstallation,
    getHelloWorldInstallationSnapshot,
    getHelloWorldInstallationSnapshot,
  );
}

