import { STATUS_LABEL } from "../lib/format";
import type { Status } from "../lib/types";

export default function StatusDot({ status }: { status: Status }) {
  return <span className={`st ${status}`}>{STATUS_LABEL[status]}</span>;
}
