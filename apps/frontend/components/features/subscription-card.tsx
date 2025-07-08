import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SubscriptionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">You are currently on the free plan.</p>
        <Button>Upgrade to Pro</Button>
      </CardContent>
    </Card>
  );
}
