import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const Play = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <div className="container py-12">
        <Card className="gradient-card border-primary/20 max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold">قريباً جداً!</h2>
            <p className="text-muted-foreground">
              صفحة اللعب جاهزة في المرحلة الجاية. هتقدر تختار الفئة، الصعوبة، وعدد الأسئلة وتبدأ اللعب.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Play;
