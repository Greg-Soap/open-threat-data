import { Head } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { PageHeader } from "@/components/dashboard/page_header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import api from "@/lib/http";

interface LookupRow {
	type: string;
	target: string;
	userName: string | null;
	createdAt: string;
}

export default function ToolMonitor() {
	const { data, isLoading } = useQuery({
		queryKey: ["intel-monitor"],
		queryFn: async () => {
			const res = await api.get<{ lookups: LookupRow[] }>("/intel/monitor");
			return res.data;
		},
		refetchInterval: 30_000,
	});

	const lookups = data?.lookups ?? [];

	return (
		<DashboardLayout>
			<Head title="OSINT Monitor" />
			<div className="space-y-6">
				<PageHeader
					title="Global OSINT Monitor"
					description="Team-wide recent lookups across all tools."
				/>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Recent lookups
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Loading variant="skeleton" type="list" count={5} />
						) : lookups.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No lookups yet. Use any tool to run a check.
							</p>
						) : (
							<ul className="space-y-2">
								{lookups.map((row, i) => (
									<li
										key={i}
										className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
									>
										<span className="font-medium capitalize">{row.type}</span>
										<span className="truncate max-w-[200px]" title={row.target}>
											{row.target}
										</span>
										<span className="text-muted-foreground">
											{row.userName ?? "Anonymous"}
										</span>
										<span className="text-muted-foreground shrink-0">
											{row.createdAt
												? formatDistanceToNow(new Date(row.createdAt), {
														addSuffix: true,
													})
												: "—"}
										</span>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	);
}
