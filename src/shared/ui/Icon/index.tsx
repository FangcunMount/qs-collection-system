import React from "react";
import type { ComponentType } from "react";

import {
  Add,
  ArrowLeft,
  ArrowRight,
  BarChartOutlined,
  Checked,
  Clock,
  Close,
  Cross,
  Delete,
  DescriptionOutlined,
  Edit,
  Fail,
  FilterOutlined,
  FriendsOutlined,
  HomeOutlined,
  InfoOutlined,
  NotesOutlined,
  Plus,
  RecordsOutlined,
  Replay,
  Search,
  SettingOutlined,
  StarOutlined,
  Success,
  TodoListOutlined,
  UserOutlined,
  WarningOutlined,
} from "../internal/taroify";

export type IconName =
  | "add-circle"
  | "arrow-left"
  | "arrow-right"
  | "chart"
  | "check"
  | "clock"
  | "close"
  | "cross"
  | "delete"
  | "edit"
  | "error"
  | "file"
  | "filter"
  | "group"
  | "home"
  | "info"
  | "list"
  | "notes"
  | "plus"
  | "records"
  | "refresh"
  | "search"
  | "settings"
  | "star"
  | "success"
  | "user"
  | "warning";

export interface IconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  className?: string;
  onClick?: (event: unknown) => void;
}

const ICONS: Record<IconName, ComponentType<any>> = {
  "add-circle": Add,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  chart: BarChartOutlined,
  check: Checked,
  clock: Clock,
  close: Close,
  cross: Cross,
  delete: Delete,
  edit: Edit,
  error: Fail,
  file: DescriptionOutlined,
  filter: FilterOutlined,
  group: FriendsOutlined,
  home: HomeOutlined,
  info: InfoOutlined,
  list: TodoListOutlined,
  notes: NotesOutlined,
  plus: Plus,
  records: RecordsOutlined,
  refresh: Replay,
  search: Search,
  settings: SettingOutlined,
  star: StarOutlined,
  success: Success,
  user: UserOutlined,
  warning: WarningOutlined,
};

const Icon = ({ name, size = 20, color = "inherit", className = "", onClick }: IconProps) => {
  const Component = ICONS[name];
  return <Component size={size} color={color} className={className} onClick={onClick} />;
};

export default Icon;
