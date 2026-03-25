import { PropsWithChildren, ViewTransition } from "react";
import { CardTitle } from "./ui/card"

export const CardTitleWithTransition = ({ children, id, className }: PropsWithChildren<{ id: string, className: string }>) => {
    return (
        <ViewTransition name={`title-${id}`}>
          <CardTitle className={className}>
            {children}
          </CardTitle>
        </ViewTransition>
    )
}