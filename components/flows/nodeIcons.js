import {
  Play,
  Clock,
  Webhook,
  Sparkles,
  Image as ImageIcon,
  Clapperboard,
  Instagram,
  Facebook,
  BookImage,
  MessageSquareReply,
  Send,
  MessageCircle,
  Video,
  GitBranch,
  Timer,
  Repeat,
} from "lucide-react";

const ICONS = {
  Play,
  Clock,
  Webhook,
  Sparkles,
  ImageIcon,
  Clapperboard,
  Instagram,
  Facebook,
  BookImage,
  MessageSquareReply,
  Send,
  MessageCircle,
  Video,
  GitBranch,
  Timer,
  Repeat,
};

export function getNodeIcon(name) {
  return ICONS[name] || Sparkles;
}
