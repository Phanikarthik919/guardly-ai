import { MapPin, GraduationCap, Calendar } from "lucide-react";

const TeamSection = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Team
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Meet <span className="text-gradient-accent">ReguGuard Innovators</span>
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Team card */}
          <div className="p-8 rounded-3xl bg-card border border-border">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Team image placeholder */}
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                    <GraduationCap className="w-12 h-12 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Team Photo</span>
                </div>
              </div>
              
              {/* Team info */}
              <div>
                <h3 className="text-2xl font-bold mb-4">ReguGuard Innovators</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <span>Anurag University, Hyderabad, Telangana</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <span>December 2025 • 36-Hour Hackathon</span>
                  </div>
                </div>
                
                {/* Team members */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Team Members</h4>
                  {[
                    { role: "Team Lead", name: "Member Name" },
                    { role: "AI Engineer", name: "Member Name" },
                    { role: "Backend Developer", name: "Member Name" },
                    { role: "Frontend Developer", name: "Member Name" },
                  ].map((member, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                    >
                      <span className="text-sm">{member.name}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Hackathon badge */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Hackathon</div>
                <div className="font-semibold">Google Cloud AI 2025</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Duration</div>
                <div className="font-semibold">36 Hours</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Submission</div>
                <div className="font-semibold">Dec 20, 2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
