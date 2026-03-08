"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ExperienceNavProps {
    sections: { id: string; label: string }[];
}

export function ExperienceNav({ sections }: ExperienceNavProps) {
    const [activeSection, setActiveSection] = useState(sections[0]?.id);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 100);

            // Find the current active section
            const sectionElements = sections.map((s) => document.getElementById(s.id));
            let currentActiveId = sections[0]?.id;

            for (let i = sectionElements.length - 1; i >= 0; i--) {
                const el = sectionElements[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 150) {
                        currentActiveId = sections[i].id;
                        break;
                    }
                }
            }

            setActiveSection(currentActiveId);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [sections]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            window.scrollTo({
                top: el.offsetTop - 100,
                behavior: "smooth",
            });
        }
    };

    return (
        <div
            className={cn(
                "sticky top-0 z-50 w-full transition-all duration-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                isScrolled ? "border-b shadow-sm py-2" : "py-4"
            )}
        >
            <div className="container mx-auto px-4 flex items-center justify-center md:justify-start gap-4 overflow-x-auto scrollbar-hide">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                            activeSection === section.id
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
