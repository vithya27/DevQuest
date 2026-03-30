import React from "react";
import {
  Map as MapIcon,
  Atom,
  Code,
  Server,
  Cloud,
  Brain,
  BarChart3,
} from "lucide-react";
import {
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaAws,
  FaDocker,
  FaCloud,
  FaChartLine,
} from "react-icons/fa";
import {
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiFirebase,
  SiMongodb,
  SiPostgresql,
  SiTailwindcss,
} from "react-icons/si";

type IconComponent = React.ElementType;

const ROADMAP_ICON_MAP: Record<string, IconComponent> = {
  // Existing saved Lucide icon values
  Map: MapIcon,
  Atom,
  Code,
  Server,
  Cloud,
  Brain,
  BarChart3,

  // React Icons options
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaAws,
  FaDocker,
  FaCloud,
  FaChartLine,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiFirebase,
  SiMongodb,
  SiPostgresql,
  SiTailwindcss,

  // Domain aliases for quick admin entry
  CloudEngineering: FaCloud,
  DataScience: Brain,
  Analytics: FaChartLine,
};

export const AVAILABLE_ROADMAP_ICONS = Object.keys(ROADMAP_ICON_MAP);

const normalizeIconName = (name?: string) => (name || "").trim();

export const getRoadmapIconComponent = (name?: string): IconComponent => {
  const normalized = normalizeIconName(name);
  return ROADMAP_ICON_MAP[normalized] || MapIcon;
};

export default function RoadmapIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = getRoadmapIconComponent(name);
  return <Icon className={className} />;
}
