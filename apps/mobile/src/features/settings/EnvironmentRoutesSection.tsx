import { useAtomValue } from "@effect/atom-react";
import {
  connectionRouteAddress,
  connectionRouteId,
  connectionRouteLabel,
  connectionRoutes,
} from "@t3tools/client-runtime/connection";
import type { EnvironmentId } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { Alert, Pressable, View } from "react-native";

import { SymbolView } from "../../components/AppSymbol";
import { AppText as Text } from "../../components/AppText";
import { environmentCatalog } from "../../connection/catalog";
import { environmentSession } from "../../state/session";
import { useAtomCommand } from "../../state/use-atom-command";
import { SettingsSection } from "./components/SettingsSection";

/**
 * The ways this device can reach an environment, preferred first. The first
 * route that answers is used, and the connection moves back up the list when
 * a better route becomes reachable again. Hidden for a single route.
 */
export function EnvironmentRoutesSection({
  environmentId,
  connected,
}: {
  readonly environmentId: EnvironmentId;
  readonly connected: boolean;
}) {
  const entry = useAtomValue(environmentCatalog.catalogValueAtom).entries.get(environmentId);
  const prepared = useAtomValue(environmentSession.preparedConnectionValueAtom(environmentId));
  const reorder = useAtomCommand(environmentCatalog.reorderRoutes, "route reorder");
  const removeRoute = useAtomCommand(environmentCatalog.removeRoute, "route removal");
  if (entry === undefined) return null;
  const routes = connectionRoutes(entry);
  if (routes.length < 2) return null;
  const activeRouteId =
    connected && Option.isSome(prepared) ? connectionRouteId(prepared.value.target) : null;
  const ids = routes.map((route) => connectionRouteId(route.target));

  const openActions = (index: number) => {
    const route = routes[index]!;
    const label = connectionRouteLabel(route);
    Alert.alert(label, connectionRouteAddress(route) ?? undefined, [
      ...(index > 0
        ? [
            {
              text: "Prefer this route",
              onPress: () => {
                const next = [...ids];
                next.splice(index, 1);
                next.unshift(ids[index]!);
                void reorder({ environmentId, routeIds: next });
              },
            },
          ]
        : []),
      {
        text: "Remove route",
        style: "destructive",
        onPress: () => void removeRoute({ environmentId, routeId: ids[index]! }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SettingsSection title="Routes">
      {routes.map((route, index) => {
        const id = ids[index]!;
        const address = connectionRouteAddress(route);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityHint="Shows options for this route"
            onPress={() => openActions(index)}
            className="flex-row items-center gap-3 p-4 active:opacity-70"
          >
            <View className="w-5 items-center">
              {id === activeRouteId ? (
                <SymbolView
                  name="checkmark"
                  size={16}
                  tintColorClassName="accent-icon"
                  type="monochrome"
                />
              ) : null}
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-base text-foreground">{connectionRouteLabel(route)}</Text>
              {address !== null ? (
                <Text numberOfLines={1} className="text-sm text-foreground-muted">
                  {address}
                </Text>
              ) : null}
            </View>
            <Text className="text-sm tabular-nums text-foreground-muted">{index + 1}</Text>
          </Pressable>
        );
      })}
      <Text className="px-4 pb-4 text-sm text-foreground-muted">
        The first route that answers is used. Pair this machine again over another address, or add
        it from T3 Connect, to add a route.
      </Text>
    </SettingsSection>
  );
}
