import {
  connectionRouteAddress,
  connectionRouteId,
  connectionRouteLabel,
  connectionRoutes,
} from "@t3tools/client-runtime/connection";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, RouteIcon, XIcon } from "lucide-react";

import { environmentCatalog } from "~/connection/catalog";
import type { EnvironmentPresentation } from "~/state/environments";
import { useAtomCommand } from "~/state/use-atom-command";
import { usePreparedConnection } from "~/state/session";
import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from "../ui/menu";

/**
 * The ways this client can reach a saved environment, preferred first. The
 * first route that answers is used, and the connection moves back up the list
 * when a better route becomes reachable. Pairing the same machine again over
 * another address, or adding it from T3 Connect, adds a route here.
 */
export function EnvironmentRoutesMenu({
  environment,
}: {
  readonly environment: EnvironmentPresentation;
}) {
  const routes = connectionRoutes(environment.entry);
  const prepared = usePreparedConnection(environment.environmentId);
  const activeRouteId =
    prepared._tag === "Some" && environment.connection.phase === "connected"
      ? connectionRouteId(prepared.value.target)
      : null;
  const reorder = useAtomCommand(environmentCatalog.reorderRoutes, "Reorder routes");
  const removeRoute = useAtomCommand(environmentCatalog.removeRoute, "Remove route");

  const move = (index: number, offset: -1 | 1) => {
    const ids = routes.map((route) => connectionRouteId(route.target));
    const [moved] = ids.splice(index, 1);
    ids.splice(index + offset, 0, moved!);
    void reorder({ environmentId: environment.environmentId, routeIds: ids });
  };

  if (routes.length < 2) return null;

  return (
    <MenuSub>
      <MenuSubTrigger>
        <RouteIcon />
        Routes
      </MenuSubTrigger>
      <MenuSubPopup className="min-w-64">
        <MenuGroup>
          <MenuGroupLabel>Preferred first</MenuGroupLabel>
          {routes.map((route, index) => {
            const id = connectionRouteId(route.target);
            const address = connectionRouteAddress(route);
            return (
              <MenuSub key={id}>
                <MenuSubTrigger>
                  {id === activeRouteId ? (
                    <CheckIcon aria-label="In use" />
                  ) : (
                    <span aria-hidden className="size-4" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{connectionRouteLabel(route)}</span>
                    {address !== null ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {address}
                      </span>
                    ) : null}
                  </span>
                </MenuSubTrigger>
                <MenuSubPopup>
                  <MenuItem disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpIcon />
                    Prefer
                  </MenuItem>
                  <MenuItem disabled={index === routes.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownIcon />
                    Use as fallback
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem
                    variant="destructive"
                    onClick={() =>
                      void removeRoute({ environmentId: environment.environmentId, routeId: id })
                    }
                  >
                    <XIcon />
                    Remove route
                  </MenuItem>
                </MenuSubPopup>
              </MenuSub>
            );
          })}
        </MenuGroup>
      </MenuSubPopup>
    </MenuSub>
  );
}
