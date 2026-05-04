import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TestComponent() {
  return (
    <div>
      <Button>Test Button</Button>
      <Card>Test Card</Card>
      <Alert>
        <AlertTitle>Test Alert</AlertTitle>
        <AlertDescription>This is a test alert description</AlertDescription>
      </Alert>
      <Progress value={50} />
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Tab 1 content</TabsContent>
      </Tabs>
    </div>
  );
}