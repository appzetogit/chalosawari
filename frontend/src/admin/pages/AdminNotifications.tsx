import React, { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  Bell,
  Send,
  Users,
  Car,
  RotateCcw,
  Trash2,
  Clock,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { adminNotifications, AdminNotificationItem } from "@/services/adminApi";
import { cn } from "@/lib/utils";

type TargetAudience = "user" | "driver" | "all";

const AdminNotifications: React.FC = () => {
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("user");
  const [isSending, setIsSending] = useState(false);

  // History state
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [historyFilter]);

  const loadNotifications = async () => {
    try {
      setIsLoadingHistory(true);
      const params: any = { limit: 50 };
      if (historyFilter !== "all") {
        params.targetAudience = historyFilter;
      }
      const response = await adminNotifications.getAll(params);
      if (response?.data) {
        setNotifications(response.data);
      }
    } catch (error: any) {
      console.warn("Could not load notification history:", error?.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setTargetAudience("user");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      toast({
        title: "Validation Error",
        description: "Please enter a notification title.",
        variant: "destructive"
      });
      return;
    }

    if (!trimmedDesc) {
      toast({
        title: "Validation Error",
        description: "Please enter notification description / message.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSending(true);
      const response = await adminNotifications.send({
        title: trimmedTitle,
        description: trimmedDesc,
        targetAudience
      });

      toast({
        title: "Notification Sent",
        description:
          response?.message ||
          `Notification sent successfully to ${
            targetAudience === "all" ? "users and drivers" : targetAudience + "s"
          }!`
      });

      // Clear form
      handleReset();

      // Refresh list
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Failed to Send",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Could not send notification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notification record?")) {
      return;
    }

    try {
      setDeletingId(id);
      await adminNotifications.delete(id);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      toast({
        title: "Deleted",
        description: "Notification record deleted successfully."
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.response?.data?.message || "Could not delete notification.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case "driver":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1 font-medium">
            <Car className="w-3 h-3" />
            Driver
          </Badge>
        );
      case "user":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 gap-1 font-medium">
            <Users className="w-3 h-3" />
            User
          </Badge>
        );
      case "all":
      default:
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 gap-1 font-medium">
            <Bell className="w-3 h-3" />
            All (User & Driver)
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
              <Bell className="w-3.5 h-3.5" />
              <span>Communication</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Notification Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Send notifications and announcements directly to users or drivers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadNotifications}
              disabled={isLoadingHistory}
              className="gap-2 text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className={cn("w-4 h-4", isLoadingHistory && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Compose Notification
            </CardTitle>
            <CardDescription>
              Choose who receives the notification, then enter the title and description.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSend} className="space-y-5">
              {/* Target Audience / Jisko bhejna hai (Compact Sleek Design) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-900">
                  Send To / Target Audience <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2.5 max-w-sm sm:max-w-md">
                  {/* User Option */}
                  <button
                    type="button"
                    onClick={() => setTargetAudience("user")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-center transition-all cursor-pointer",
                      targetAudience === "user"
                        ? "border-blue-600 bg-blue-50/90 text-blue-900 font-semibold ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        targetAudience === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold">User</span>
                  </button>

                  {/* Driver Option */}
                  <button
                    type="button"
                    onClick={() => setTargetAudience("driver")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-center transition-all cursor-pointer",
                      targetAudience === "driver"
                        ? "border-amber-600 bg-amber-50/90 text-amber-900 font-semibold ring-2 ring-amber-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        targetAudience === "driver"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold">Driver</span>
                  </button>

                  {/* Both (All) Option */}
                  <button
                    type="button"
                    onClick={() => setTargetAudience("all")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-center transition-all cursor-pointer",
                      targetAudience === "all"
                        ? "border-purple-600 bg-purple-50/90 text-purple-900 font-semibold ring-2 ring-purple-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        targetAudience === "all"
                          ? "bg-purple-600 text-white"
                          : "bg-purple-100 text-purple-700"
                      )}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold">Both</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notification-title" className="text-sm font-semibold text-slate-900">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-slate-400">{title.length}/100</span>
                </div>
                <Input
                  id="notification-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder="e.g. Special Holiday Discount / Important Service Update"
                  className="h-11 rounded-xl text-slate-900"
                  disabled={isSending}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notification-desc" className="text-sm font-semibold text-slate-900">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-slate-400">{description.length}/500</span>
                </div>
                <Textarea
                  id="notification-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Write your complete notification description here..."
                  rows={4}
                  className="rounded-xl text-slate-900 resize-none"
                  disabled={isSending}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSending || !title.trim() || !description.trim()}
                  className="w-full sm:w-auto sm:min-w-[180px] h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-2 shadow-sm"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Notification...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Notification
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSending || (!title && !description)}
                  className="w-full sm:w-auto h-11 rounded-xl text-slate-700 hover:bg-slate-100"
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sent Notifications History (Clean list without any stats cards) */}
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Sent Notifications History
              </CardTitle>
              <CardDescription>
                Review and manage previously sent broadcast notifications.
              </CardDescription>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <Button
                type="button"
                variant={historyFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setHistoryFilter("all")}
                className={cn(
                  "h-8 px-3 text-xs rounded-lg font-medium",
                  historyFilter === "all" && "bg-white text-slate-900 shadow-xs"
                )}
              >
                All
              </Button>
              <Button
                type="button"
                variant={historyFilter === "user" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setHistoryFilter("user")}
                className={cn(
                  "h-8 px-3 text-xs rounded-lg font-medium",
                  historyFilter === "user" && "bg-white text-slate-900 shadow-xs"
                )}
              >
                Users
              </Button>
              <Button
                type="button"
                variant={historyFilter === "driver" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setHistoryFilter("driver")}
                className={cn(
                  "h-8 px-3 text-xs rounded-lg font-medium",
                  historyFilter === "driver" && "bg-white text-slate-900 shadow-xs"
                )}
              >
                Drivers
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-sm">Loading notifications history...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">No Notifications Sent Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Use the compose form above to send your first notification to users or drivers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getAudienceBadge(item.targetAudience)}
                        <h4 className="font-bold text-sm text-slate-900 break-words">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })
                            : "Recently"}
                        </span>
                        {item.recipientCount !== undefined && item.recipientCount > 0 && (
                          <span>• {item.recipientCount} Recipients</span>
                        )}
                        {item.sentBy?.email && (
                          <span className="hidden md:inline">• Sent by {item.sentBy.email}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 rounded-lg text-xs"
                      >
                        {deletingId === item._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1 sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
