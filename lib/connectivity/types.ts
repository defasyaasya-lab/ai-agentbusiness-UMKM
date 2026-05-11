export type ConnectionStatus =
  | "online"
  | "degraded"
  | "switching"
  | "backup"
  | "offline";

export type ActiveRoute = "primary" | "backup";

export type ConnectionKind = "wifi" | "phone_hotspot";

export type ConnectionHealth = "online" | "degraded" | "ready" | "active" | "offline";

export type RiskState = "safe" | "warning" | "critical";

export type SwitchEventResult =
  | "none"
  | "prepared_backup"
  | "switch_started"
  | "switch_success"
  | "switch_failed";

export type LocalAgentConnection = {
  name: string;
  kind: ConnectionKind;
  status: ConnectionHealth;
};

export type BusinessImpact = {
  savedRevenue: number;
  riskRevenue: number;
  protectedOrders: number;
};

export type SwitchEvent = {
  result: SwitchEventResult;
  activeRouteAfter: ActiveRoute;
  durationMs: number;
  message: string;
  timestamp: string;
};

export type ConnectivityHistoryEntry = {
  timestamp: string;
  connectionStatus: ConnectionStatus;
  activeRoute: ActiveRoute;
  speedMbps: number;
  latencyMs: number;
  riskState: RiskState;
};

export type RiskPatternInsight = {
  title: string;
  message: string;
  peakHours: string[];
  riskUpdateCount: number;
  totalUpdateCount: number;
  generatedAt: string;
};

export type ConnectivityStatus = {
  connectionStatus: ConnectionStatus;
  activeRoute: ActiveRoute;
  primaryConnection: LocalAgentConnection;
  backupConnection: LocalAgentConnection;
  speedMbps: number;
  latencyMs: number;
  riskState: RiskState;
  businessImpact: BusinessImpact;
  chartValues: number[];
  latestSwitchEvent: SwitchEvent;
  riskInsight: RiskPatternInsight;
  updatedAt: string;
};

export type ConnectivityStatusUpdate = Partial<
  Omit<
    ConnectivityStatus,
    | "primaryConnection"
    | "backupConnection"
    | "businessImpact"
    | "latestSwitchEvent"
  >
> & {
  primaryConnection?: Partial<LocalAgentConnection>;
  backupConnection?: Partial<LocalAgentConnection>;
  businessImpact?: Partial<BusinessImpact>;
  latestSwitchEvent?: Partial<SwitchEvent>;
};

export type SwitchEventUpdate = Partial<Omit<SwitchEvent, "timestamp">> & {
  timestamp?: string;
};
