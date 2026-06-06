import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SignalDetail from "@/pages/signal-detail";
import Settings from "@/pages/settings";
import Guides from "@/pages/guides";
import GuideViewer from "@/pages/guide-viewer";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signals/:id" component={SignalDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/guides" component={Guides} />
      <Route path="/guide" component={GuideViewer} />
      <Route path="/guide/:slug" component={GuideViewer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
